import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Clinic } from '../clinics/entities/clinic.entity';
import { Branch } from '../branch/entities/branch.entity';
import { DoctorProfile } from '../doctor-profile/entities/doctor-profile.entity';
import { DoctorClinicAffiliation, AffiliationStatus } from '../doctor-affiliation/entities/doctor-clinic-affiliation.entity';
import { DoctorLocation } from '../doctor-profile/entities/doctor-location.entity';
import { ClinicService } from '../services/entities/service.entity';
import { User } from '../users/entities/user.entity';

/** Haversine distance in km */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isOpenNow(openingHours: Record<string, any> | null): boolean {
  if (!openingHours) return false;
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const now = new Date();
  const day = days[now.getDay()];
  const oh = openingHours[day];
  if (!oh || oh.closed) return false;
  const [oh1, om1] = oh.open.split(':').map(Number);
  const [oh2, om2] = oh.close.split(':').map(Number);
  const currentMins = now.getHours() * 60 + now.getMinutes();
  return currentMins >= oh1 * 60 + om1 && currentMins <= oh2 * 60 + om2;
}

@Injectable()
export class DiscoveryService {
  constructor(
    @InjectRepository(Clinic) private clinicRepo: Repository<Clinic>,
    @InjectRepository(Branch) private branchRepo: Repository<Branch>,
    @InjectRepository(DoctorProfile) private profileRepo: Repository<DoctorProfile>,
    @InjectRepository(DoctorClinicAffiliation) private affiliationRepo: Repository<DoctorClinicAffiliation>,
    @InjectRepository(DoctorLocation) private locationRepo: Repository<DoctorLocation>,
    @InjectRepository(ClinicService) private serviceRepo: Repository<ClinicService>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  /**
   * For a clinic, returns the set of "locations" patients should be able to
   * discover it at: one entry per publicly-listed branch that has its own
   * coordinates, falling back to the clinic's own address/coordinates when
   * the clinic has no branches (or no branch is publicly listed/located).
   * This is what lets a multi-branch clinic show up correctly per-location
   * in distance-based search instead of being pinned to a single point.
   */
  private async getClinicLocations(clinic: Clinic): Promise<Array<{
    branchId: string | null; branchName: string | null;
    address: string | null; latitude: number | null; longitude: number | null;
  }>> {
    const branches = await this.branchRepo.find({
      where: { clinicId: clinic.id, isPubliclyListed: true, isActive: true },
    });

    const located = branches.filter(b => b.latitude != null && b.longitude != null);
    if (located.length > 0) {
      return located.map(b => ({
        branchId: b.id, branchName: b.name,
        address: b.address ?? clinic.address ?? null,
        latitude: Number(b.latitude), longitude: Number(b.longitude),
      }));
    }

    // No located public branches — fall back to the clinic's own pin (if any)
    if (clinic.latitude != null && clinic.longitude != null) {
      return [{
        branchId: null, branchName: null,
        address: clinic.address ?? null,
        latitude: Number(clinic.latitude), longitude: Number(clinic.longitude),
      }];
    }

    return [];
  }

  async findNearbyClinics(params: {
    lat?: number; lng?: number; radiusKm?: number; category?: string;
    search?: string; acceptsInsurance?: boolean; openNow?: boolean;
    minRating?: number; sort?: string; page?: number; limit?: number;
  }) {
    const { lat, lng, radiusKm = 20, category, search, acceptsInsurance, openNow, minRating, sort = 'distance', page = 1, limit = 20 } = params;

    let clinics = await this.clinicRepo.find({ where: { isPubliclyListed: true, isActive: true } });

    // Category filter
    if (category) {
      clinics = clinics.filter(c => c.categoryTags?.includes(category.toLowerCase()));
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      clinics = clinics.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.publicDescription?.toLowerCase().includes(q)
      );
    }

    if (acceptsInsurance !== undefined) {
      clinics = clinics.filter(c => c.acceptsInsurance === acceptsInsurance);
    }

    if (openNow) {
      clinics = clinics.filter(c => c.isOpen24Hours || isOpenNow(c.openingHours));
    }

    if (minRating !== undefined) {
      clinics = clinics.filter(c => c.rating != null && Number(c.rating) >= minRating);
    }

    // Resolve each clinic to its nearest publicly-listed branch location
    // (or its own clinic-level pin if it has no located public branches),
    // so multi-branch clinics are matched/sorted by the closest branch.
    let enriched = await Promise.all(clinics.map(async c => {
      const locations = await this.getClinicLocations(c);

      let nearest: { branchId: string | null; branchName: string | null; address: string | null; latitude: number | null; longitude: number | null } | null = locations[0] ?? null;
      let distance: number | null = null;

      if (lat !== undefined && lng !== undefined) {
        for (const loc of locations) {
          if (loc.latitude == null || loc.longitude == null) continue;
          const d = haversine(lat, lng, loc.latitude, loc.longitude);
          if (distance === null || d < distance) { distance = d; nearest = loc; }
        }
      }

      return { clinic: c, nearest, distance };
    }));

    // Geo filter — only applies when a coordinate search was requested
    if (lat !== undefined && lng !== undefined) {
      enriched = enriched.filter(e => e.distance !== null && e.distance <= radiusKm);
    }

    // Sort
    if (sort === 'rating') {
      enriched.sort((a, b) => (Number(b.clinic.rating) || 0) - (Number(a.clinic.rating) || 0));
    } else if (sort === 'distance' && lat !== undefined) {
      enriched.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    }

    const total = enriched.length;
    const paginated = enriched.slice((page - 1) * limit, page * limit);

    return {
      data: paginated.map(({ clinic: c, nearest, distance }) => ({
        id: c.id, name: c.name, slug: c.slug, city: c.city,
        address: nearest?.address ?? c.address,
        latitude: nearest?.latitude ?? c.latitude,
        longitude: nearest?.longitude ?? c.longitude,
        branchId: nearest?.branchId ?? null,
        branchName: nearest?.branchName ?? null,
        logo: c.logo,
        coverImageUrl: c.coverImageUrl, categoryTags: c.categoryTags,
        rating: c.rating, reviewCount: c.reviewCount,
        isOpen24Hours: c.isOpen24Hours, isEmergencyCapable: c.isEmergencyCapable,
        acceptsInsurance: c.acceptsInsurance, languagesSpoken: c.languagesSpoken,
        openingHours: c.openingHours,
        distance: distance != null ? Math.round(distance * 10) / 10 : null,
        isOpenNow: c.isOpen24Hours || isOpenNow(c.openingHours),
      })),
      total, page, limit,
    };
  }

  async getClinicProfile(slug: string) {
    const clinic = await this.clinicRepo.findOne({ where: { slug, isPubliclyListed: true } });
    if (!clinic) return null;

    const [services, affiliations, locations] = await Promise.all([
      this.serviceRepo.find({ where: { clinicId: clinic.id, isActive: true } }),
      this.affiliationRepo.find({
        where: { clinicId: clinic.id, status: AffiliationStatus.ACTIVE },
        relations: ['doctor'],
      }),
      this.getClinicLocations(clinic),
    ]);

    const doctorProfiles = await Promise.all(
      affiliations.map(async a => {
        const profile = await this.profileRepo.findOne({ where: { userId: a.doctorUserId } });
        return {
          userId: a.doctorUserId,
          name: `${a.doctor.firstName} ${a.doctor.lastName}`,
          role: a.doctor.role,
          specializations: profile?.specializations || [],
          qualifications: profile?.qualifications || [],
          profilePhotoUrl: profile?.profilePhotoUrl || a.doctor.avatar,
          consultationFee: profile?.consultationFee,
          rating: profile?.rating,
          reviewCount: profile?.reviewCount,
          yearsOfExperience: profile?.yearsOfExperience,
        };
      })
    );

    return {
      ...clinic,
      // Publicly-visible branch locations (per-location discovery). Falls
      // back to the clinic's own single pin when no branch is located/listed.
      locations,
      services,
      doctors: doctorProfiles,
    };
  }


  async findNearbyDoctors(params: {
    lat?: number; lng?: number; radiusKm?: number; specialization?: string;
    search?: string; consultationType?: string; availableToday?: boolean;
    availableForInstantConsult?: boolean; sort?: string;
    page?: number; limit?: number;
  }) {
    const { lat, lng, radiusKm = 20, specialization, search, consultationType, availableForInstantConsult, sort = 'distance', page = 1, limit = 20 } = params;

    let profiles = await this.profileRepo.find({
      where: { isPubliclyListed: true },
      relations: ['user'],
    });

    if (specialization) {
      profiles = profiles.filter(p => p.specializations?.some(s => s.toLowerCase().includes(specialization.toLowerCase())));
    }

    // Free-text search by doctor name, specialization, or bio — mirrors the
    // clinics endpoint's `search` filter. Previously the frontend sent this
    // param but the backend never read it, so searching for a doctor by
    // name silently returned every doctor instead of filtering.
    if (search) {
      const q = search.toLowerCase();
      profiles = profiles.filter(p => {
        const fullName = `${p.user?.firstName || ''} ${p.user?.lastName || ''}`.toLowerCase();
        return (
          fullName.includes(q) ||
          p.specializations?.some(s => s.toLowerCase().includes(q)) ||
          p.bio?.toLowerCase().includes(q)
        );
      });
    }

    if (availableForInstantConsult) {
      profiles = profiles.filter(p => p.isAvailableForInstantConsult);
    }

    // Enrich with locations
    const enriched = await Promise.all(profiles.map(async p => {
      const affiliations = await this.affiliationRepo.find({
        where: { doctorUserId: p.userId, status: AffiliationStatus.ACTIVE },
        relations: ['clinic', 'branch'],
      });
      const independentLocations = await this.locationRepo.find({
        where: { doctorUserId: p.userId, isActive: true },
      });

      const practiceLocations = [
        ...affiliations.map(a => ({
          type: 'clinic' as const,
          clinicId: a.clinicId,
          clinicName: a.clinic?.name,
          branchId: a.branchId ?? null,
          branchName: a.branch?.name ?? null,
          // Prefer the doctor's affiliated branch coordinates/address (a clinic
          // can have many branches at different locations) — fall back to the
          // clinic-level pin only when the branch has no coordinates of its own.
          address: a.branch?.address ?? a.clinic?.address,
          latitude: a.branch?.latitude ?? a.clinic?.latitude,
          longitude: a.branch?.longitude ?? a.clinic?.longitude,
        })),
        ...independentLocations.map(l => ({
          type: 'independent' as const,
          locationId: l.id,
          name: l.name,
          address: l.address,
          latitude: l.latitude,
          longitude: l.longitude,
        })),
      ];

      let minDistance: number | null = null;
      if (lat !== undefined && lng !== undefined) {
        for (const loc of practiceLocations) {
          if (loc.latitude && loc.longitude) {
            const d = haversine(lat, lng, Number(loc.latitude), Number(loc.longitude));
            if (minDistance === null || d < minDistance) minDistance = d;
          }
        }
      }

      return { ...p, practiceLocations, _distance: minDistance };
    }));

    let results = enriched;

    if (lat !== undefined && lng !== undefined) {
      results = results.filter(r => r._distance === null || r._distance <= radiusKm);
    }

    if (sort === 'rating') {
      results.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    } else if (sort === 'fee') {
      results.sort((a, b) => (Number(a.consultationFee) || 0) - (Number(b.consultationFee) || 0));
    } else if (lat !== undefined) {
      results.sort((a, b) => (a._distance ?? 999) - (b._distance ?? 999));
    }

    const total = results.length;
    const paginated = results.slice((page - 1) * limit, page * limit);

    return {
      data: paginated.map(r => ({
        userId: r.userId,
        name: `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim(),
        specializations: r.specializations,
        qualifications: r.qualifications,
        yearsOfExperience: r.yearsOfExperience,
        bio: r.bio,
        consultationFee: r.consultationFee,
        videoConsultationFee: r.videoConsultationFee,
        profilePhotoUrl: r.profilePhotoUrl || r.user?.avatar,
        rating: r.rating,
        reviewCount: r.reviewCount,
        isAvailableForInstantConsult: r.isAvailableForInstantConsult,
        languagesSpoken: r.languagesSpoken,
        practiceLocations: r.practiceLocations,
        distance: r._distance != null ? Math.round(r._distance * 10) / 10 : null,
      })),
      total, page, limit,
    };
  }

  async getDoctorProfile(doctorUserId: string) {
    const profile = await this.profileRepo.findOne({
      where: { userId: doctorUserId, isPubliclyListed: true },
      relations: ['user'],
    });
    if (!profile) return null;

    const [affiliations, independentLocations, services] = await Promise.all([
      this.affiliationRepo.find({
        where: { doctorUserId, status: AffiliationStatus.ACTIVE },
        relations: ['clinic', 'branch'],
      }),
      this.locationRepo.find({ where: { doctorUserId, isActive: true } }),
      this.serviceRepo.find({ where: { isActive: true } }),
    ]);

    return {
      userId: profile.userId,
      name: `${profile.user?.firstName || ''} ${profile.user?.lastName || ''}`.trim(),
      specializations: profile.specializations,
      qualifications: profile.qualifications,
      yearsOfExperience: profile.yearsOfExperience,
      bio: profile.bio,
      consultationFee: profile.consultationFee,
      videoConsultationFee: profile.videoConsultationFee,
      profilePhotoUrl: profile.profilePhotoUrl || profile.user?.avatar,
      rating: profile.rating,
      reviewCount: profile.reviewCount,
      isAvailableForInstantConsult: profile.isAvailableForInstantConsult,
      languagesSpoken: profile.languagesSpoken,
      affiliations: affiliations.map(a => ({
        clinicId: a.clinicId,
        clinicName: a.clinic?.name,
        clinicSlug: a.clinic?.slug,
        clinicAddress: a.clinic?.address,
        clinicPhone: a.clinic?.phone,
        branchId: a.branchId ?? null,
        branchName: a.branch?.name,
        // Branch coordinates/address take priority — a clinic's branches can
        // sit at different locations from the clinic's own registered pin.
        address: a.branch?.address ?? a.clinic?.address,
        latitude: a.branch?.latitude ?? a.clinic?.latitude,
        longitude: a.branch?.longitude ?? a.clinic?.longitude,
      })),
      independentLocations,
    };
  }

  async compareServices(params: { category?: string; lat?: number; lng?: number; radiusKm?: number }) {
    const { category, lat, lng, radiusKm = 20 } = params;
    let services = await this.serviceRepo.find({ where: { isActive: true } });

    if (category) {
      services = services.filter(s => s.name.toLowerCase().includes(category.toLowerCase()));
    }

    const enriched = await Promise.all(services.map(async s => {
      const clinic = await this.clinicRepo.findOne({ where: { id: s.clinicId, isPubliclyListed: true } });
      if (!clinic) return null;
      let distance: number | null = null;
      if (lat !== undefined && lng !== undefined && clinic.latitude && clinic.longitude) {
        distance = haversine(lat, lng, Number(clinic.latitude), Number(clinic.longitude));
        if (distance > radiusKm) return null;
      }
      return {
        serviceName: s.name, price: s.price, duration: s.duration,
        clinicId: clinic.id, clinicName: clinic.name, clinicSlug: clinic.slug,
        distance: distance != null ? Math.round(distance * 10) / 10 : null,
      };
    }));

    return enriched.filter(Boolean).sort((a: any, b: any) => (a.price || 0) - (b.price || 0));
  }
}
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DoctorClinicAffiliation, AffiliationStatus } from './entities/doctor-clinic-affiliation.entity';
import { User, isDoctorRole } from '../users/entities/user.entity';
import { DoctorProfile } from '../doctor-profile/entities/doctor-profile.entity';
import { Clinic } from '../clinics/entities/clinic.entity';

@Injectable()
export class DoctorAffiliationService {
  constructor(
    @InjectRepository(DoctorClinicAffiliation) private affiliationRepo: Repository<DoctorClinicAffiliation>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(DoctorProfile) private profileRepo: Repository<DoctorProfile>,
    @InjectRepository(Clinic) private clinicRepo: Repository<Clinic>,
  ) {}

  /** Called when owner assigns a doctor/dentist role to an existing staff member */
  async createAffiliation(doctorUserId: string, clinicId: string, branchId?: string, isPrimary = true): Promise<DoctorClinicAffiliation> {
    const existing = await this.affiliationRepo.findOne({ where: { doctorUserId, clinicId } });
    if (existing) {
      existing.status = AffiliationStatus.ACTIVE;
      existing.joinedAt = new Date();
      return this.affiliationRepo.save(existing);
    }

    const aff = this.affiliationRepo.create({
      doctorUserId, clinicId, branchId,
      status: AffiliationStatus.ACTIVE,
      isPrimaryEmployment: isPrimary,
      invitedAt: new Date(),
      joinedAt: new Date(),
    });

    // Ensure DoctorProfile exists
    await this.ensureProfile(doctorUserId);
    return this.affiliationRepo.save(aff);
  }

  /** Invite an existing independent doctor by userId */
  async inviteDoctor(doctorUserId: string, clinicId: string, branchId?: string): Promise<DoctorClinicAffiliation> {
    const user = await this.userRepo.findOne({ where: { id: doctorUserId } });
    if (!user || !isDoctorRole(user.role)) throw new NotFoundException('Doctor not found');

    const existing = await this.affiliationRepo.findOne({ where: { doctorUserId, clinicId } });
    if (existing && existing.status === AffiliationStatus.ACTIVE) throw new BadRequestException('Doctor already affiliated');

    if (existing) {
      existing.status = AffiliationStatus.INVITED;
      existing.invitedAt = new Date();
      return this.affiliationRepo.save(existing);
    }

    return this.affiliationRepo.save(
      this.affiliationRepo.create({ doctorUserId, clinicId, branchId, status: AffiliationStatus.INVITED, invitedAt: new Date() })
    );
  }

  async acceptInvite(affiliationId: string, doctorUserId: string): Promise<DoctorClinicAffiliation> {
    const aff = await this.affiliationRepo.findOne({ where: { id: affiliationId, doctorUserId, status: AffiliationStatus.INVITED } });
    if (!aff) throw new NotFoundException('Invitation not found');
    aff.status = AffiliationStatus.ACTIVE;
    aff.joinedAt = new Date();
    return this.affiliationRepo.save(aff);
  }

  async declineInvite(affiliationId: string, doctorUserId: string): Promise<void> {
    const aff = await this.affiliationRepo.findOne({ where: { id: affiliationId, doctorUserId, status: AffiliationStatus.INVITED } });
    if (!aff) throw new NotFoundException('Invitation not found');
    aff.status = AffiliationStatus.REMOVED;
    await this.affiliationRepo.save(aff);
  }

  async suspendDoctor(affiliationId: string, clinicId: string): Promise<DoctorClinicAffiliation> {
    const aff = await this.affiliationRepo.findOne({ where: { id: affiliationId, clinicId } });
    if (!aff) throw new NotFoundException('Affiliation not found');
    aff.status = AffiliationStatus.SUSPENDED;
    return this.affiliationRepo.save(aff);
  }

  async removeDoctor(affiliationId: string, clinicId: string): Promise<DoctorClinicAffiliation> {
    const aff = await this.affiliationRepo.findOne({ where: { id: affiliationId, clinicId } });
    if (!aff) throw new NotFoundException('Affiliation not found');
    aff.status = AffiliationStatus.REMOVED;
    return this.affiliationRepo.save(aff);
  }

  async getClinicAffiliations(clinicId: string): Promise<DoctorClinicAffiliation[]> {
    return this.affiliationRepo.find({
      where: { clinicId },
      relations: ['doctor'],
    });
  }

  async getDoctorAffiliations(doctorUserId: string): Promise<DoctorClinicAffiliation[]> {
    return this.affiliationRepo.find({
      where: { doctorUserId },
      relations: ['clinic', 'branch'],
    });
  }

  async getPendingInvites(doctorUserId: string): Promise<DoctorClinicAffiliation[]> {
    return this.affiliationRepo.find({
      where: { doctorUserId, status: AffiliationStatus.INVITED },
      relations: ['clinic'],
    });
  }

  private async ensureProfile(userId: string): Promise<void> {
    const existing = await this.profileRepo.findOne({ where: { userId } });
    if (!existing) {
      await this.profileRepo.save(this.profileRepo.create({ userId }));
    }
  }
}

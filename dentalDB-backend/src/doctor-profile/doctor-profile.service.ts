import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DoctorProfile } from './entities/doctor-profile.entity';
import { DoctorLocation } from './entities/doctor-location.entity';
import { IndependentAvailability } from './entities/independent-availability.entity';

@Injectable()
export class DoctorProfileService {
  constructor(
    @InjectRepository(DoctorProfile) private profileRepo: Repository<DoctorProfile>,
    @InjectRepository(DoctorLocation) private locationRepo: Repository<DoctorLocation>,
    @InjectRepository(IndependentAvailability) private availRepo: Repository<IndependentAvailability>,
  ) {}

  async getOrCreate(userId: string): Promise<DoctorProfile> {
    let profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      profile = await this.profileRepo.save(this.profileRepo.create({ userId }));
    }
    return profile;
  }

  async update(userId: string, dto: Partial<DoctorProfile>): Promise<DoctorProfile> {
    let profile = await this.getOrCreate(userId);
    Object.assign(profile, dto);
    return this.profileRepo.save(profile);
  }

  async updateHeartbeat(userId: string): Promise<void> {
    await this.profileRepo.update({ userId }, { lastSeenAt: new Date() });
  }

  // ── Locations ─────────────────────────────────────────────────────
  async getLocations(doctorUserId: string): Promise<DoctorLocation[]> {
    return this.locationRepo.find({ where: { doctorUserId, isActive: true } });
  }

  async addLocation(doctorUserId: string, dto: Partial<DoctorLocation>): Promise<DoctorLocation> {
    return this.locationRepo.save(this.locationRepo.create({ ...dto, doctorUserId }));
  }

  async removeLocation(id: string, doctorUserId: string): Promise<void> {
    const loc = await this.locationRepo.findOne({ where: { id, doctorUserId } });
    if (!loc) throw new NotFoundException('Location not found');
    loc.isActive = false;
    await this.locationRepo.save(loc);
  }

  // ── Availability ──────────────────────────────────────────────────
  async getAvailability(doctorUserId: string): Promise<IndependentAvailability[]> {
    return this.availRepo.find({ where: { doctorUserId, isActive: true }, relations: ['location'] });
  }

  async setAvailability(doctorUserId: string, slots: Partial<IndependentAvailability>[]): Promise<IndependentAvailability[]> {
    // Replace all active slots for doctor
    await this.availRepo.update({ doctorUserId }, { isActive: false });
    const created = slots.map(s => this.availRepo.create({ ...s, doctorUserId, isActive: true }));
    return this.availRepo.save(created);
  }

  async deleteAvailability(id: string, doctorUserId: string): Promise<void> {
    await this.availRepo.update({ id, doctorUserId }, { isActive: false });
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PatientRecordConsent } from './entities/patient-record-consent.entity';

@Injectable()
export class PatientRecordConsentService {
  constructor(
    @InjectRepository(PatientRecordConsent)
    private readonly repo: Repository<PatientRecordConsent>,
  ) {}

  /** Whether `clinicId` is currently authorized to view this account's full cross-clinic history. */
  async isGranted(patientAccountId: string, clinicId: string): Promise<boolean> {
    const row = await this.repo.findOne({ where: { patientAccountId, clinicId } });
    return !!row?.granted;
  }

  /** Bulk lookup — clinicId -> granted, for every clinic this account has a consent row for. */
  async getConsentMap(patientAccountId: string): Promise<Map<string, boolean>> {
    const rows = await this.repo.find({ where: { patientAccountId } });
    return new Map(rows.map(r => [r.clinicId, r.granted]));
  }

  async listForAccount(patientAccountId: string): Promise<PatientRecordConsent[]> {
    return this.repo.find({ where: { patientAccountId } });
  }

  /**
   * Patient-driven toggle. Setting `granted: false` (the default / revoke
   * path) never deletes history — it just stops this clinic from being
   * able to pull the merged cross-clinic timeline going forward.
   */
  async setConsent(patientAccountId: string, clinicId: string, granted: boolean): Promise<PatientRecordConsent> {
    let row = await this.repo.findOne({ where: { patientAccountId, clinicId } });
    const now = new Date();

    if (!row) {
      row = this.repo.create({ patientAccountId, clinicId, granted });
    } else {
      row.granted = granted;
    }

    if (granted) row.grantedAt = now;
    else row.revokedAt = now;

    return this.repo.save(row);
  }

  async getGrantedClinicIds(patientAccountId: string): Promise<string[]> {
    const rows = await this.repo.find({ where: { patientAccountId, granted: true } });
    return rows.map(r => r.clinicId);
  }
}

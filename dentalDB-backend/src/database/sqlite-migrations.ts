// AUTO-GENERATED explicit migration list for the SQLite (offline/desktop) DB.
// Regenerate, do not hand-edit.
// Used by: data-source.sqlite.ts + typeorm-options.factory.ts (sqlite driver).
import { Migration1782578519527 } from '../migrations/sqlite/1782578519527-Migration';
import { Migration1782585652427 } from '../migrations/sqlite/1782585652427-Migration';
import { Migration1782620042829 } from '../migrations/sqlite/1782620042829-Migration';
import { SyncDevices1782900000001 } from '../migrations/sqlite/1782900000001-SyncDevices';
import { AutoGenDiff1783827206937 } from '../migrations/sqlite/1783827206937-AutoGenDiff';
import { PatientAccounts1784100000000 } from '../migrations/sqlite/1784100000000-PatientAccounts';
import { PatientAccountPassword1784200000000 } from '../migrations/sqlite/1784200000000-PatientAccountPassword';
import { ClinicalRecordVisits1784300000000 } from '../migrations/sqlite/1784300000000-ClinicalRecordVisits';
import { RecordsBranchScoping1784400000000 } from '../migrations/sqlite/1784400000000-RecordsBranchScoping';
import { IndependentDoctorRoleScope1784500000000 } from '../migrations/sqlite/1784500000000-IndependentDoctorRoleScope';
import { NotificationPatientId1784600000000 } from '../migrations/sqlite/1784600000000-NotificationPatientId';
import { AuditLogWalletEnumValue1784700000000 } from '../migrations/sqlite/1784700000000-AuditLogWalletEnumValue';
import { AppointmentIndependentBookingNullable1784800000000 } from '../migrations/sqlite/1784800000000-AppointmentIndependentBookingNullable';
import { InvoiceNumberPerClinicUnique1784900000000 } from '../migrations/sqlite/1784900000000-InvoiceNumberPerClinicUnique.sqlite';
import { PatientFileBlobSync1785000000000 } from '../migrations/sqlite/1785000000000-PatientFileBlobSync.sqlite';
import { RecallBranchScoping1785200000000 } from '../migrations/sqlite/1785200000000-RecallBranchScoping';
import { TreatmentPlansAndInventoryConsumption1785500000000 } from '../migrations/sqlite/1785500000000-TreatmentPlansAndInventoryConsumption';
import { PharmacyPackage1785600000000 } from '../migrations/sqlite/1785600000000-PharmacyPackage';
import { PrescriptionPharmacyDispensing1785700000000 } from '../migrations/sqlite/1785700000000-PrescriptionPharmacyDispensing';
import { ConsolidateLabWork1785800000000 } from '../migrations/sqlite/1785800000000-ConsolidateLabWork';
import { AuditLogLabWorkEnumValue1785900000000 } from '../migrations/sqlite/1785900000000-AuditLogLabWorkEnumValue';
import { DesignStudioTemplateColumns1786000000000 } from '../migrations/sqlite/1786000000000-DesignStudioTemplateColumns';
import { FinanceModule1786100000000 } from '../migrations/sqlite/1786100000000-FinanceModule';

export const SQLITE_MIGRATIONS = [
  Migration1782578519527,
  Migration1782585652427,
  Migration1782620042829,
  SyncDevices1782900000001,
  AutoGenDiff1783827206937,
  PatientAccounts1784100000000,
  PatientAccountPassword1784200000000,
  ClinicalRecordVisits1784300000000,
  RecordsBranchScoping1784400000000,
  IndependentDoctorRoleScope1784500000000,
  NotificationPatientId1784600000000,
  AuditLogWalletEnumValue1784700000000,
  AppointmentIndependentBookingNullable1784800000000,
  InvoiceNumberPerClinicUnique1784900000000,
  PatientFileBlobSync1785000000000,
  RecallBranchScoping1785200000000,
  TreatmentPlansAndInventoryConsumption1785500000000,
  PharmacyPackage1785600000000,
  PrescriptionPharmacyDispensing1785700000000,
  ConsolidateLabWork1785800000000,
  AuditLogLabWorkEnumValue1785900000000,
  DesignStudioTemplateColumns1786000000000,
  FinanceModule1786100000000,
];
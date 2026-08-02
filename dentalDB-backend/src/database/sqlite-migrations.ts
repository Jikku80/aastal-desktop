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
];
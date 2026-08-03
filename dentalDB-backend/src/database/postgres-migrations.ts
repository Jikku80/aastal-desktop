// AUTO-GENERATED explicit migration list — replaces TypeORM's filesystem-glob
// migration discovery (breaks under the bundled Electron build; see
// all-entities.ts for the full explanation). Regenerate, do not hand-edit.
// Used by: data-source.postgres.ts (online/server DB, Postgres driver).
// Regenerate with: npm run migration:sync-list
import { SeoInfrastructure1700000000001 } from '../migrations/1700000000001-SeoInfrastructure';
import { Migration1778951127866 } from '../migrations/1778951127866-Migration';
import { Migration1779036761412 } from '../migrations/1779036761412-Migration';
import { Migration1779681273006 } from '../migrations/1779681273006-Migration';
import { Migration1780739600415 } from '../migrations/1780739600415-Migration';
import { Migration1781328589625 } from '../migrations/1781328589625-Migration';
import { BranchLocationAndVisibility1781780415382 } from '../migrations/1781780415382-BranchLocationAndVisibility';
import { Migration1781849186285 } from '../migrations/1781849186285-Migration';
import { Migration1782060615918 } from '../migrations/1782060615918-Migration';
import { Migration1782471025559 } from '../migrations/1782471025559-Migration';
import { Migration1782474517701 } from '../migrations/1782474517701-Migration';
import { SyncDevices1782900000000 } from '../migrations/1782900000000-SyncDevices';
import { Migration1782924499469 } from '../migrations/1782924499469-Migration';
import { Migration1783496503624 } from '../migrations/1783496503624-Migration';
import { Migration1783754843181 } from '../migrations/1783754843181-Migration';
import { AuditLogWalletEnumValue1783933938709 } from '../migrations/1783933938709-AuditLogWalletEnumValue';
import { PatientAccountPassword1784200000000 } from '../migrations/1784200000000-PatientAccountPassword';
import { ClinicalRecordVisits1784300000000 } from '../migrations/1784300000000-ClinicalRecordVisits';
import { RecordsBranchScoping1784400000000 } from '../migrations/1784400000000-RecordsBranchScoping';
import { IndependentDoctorRoleScope1784500000000 } from '../migrations/1784500000000-IndependentDoctorRoleScope';
import { NotificationPatientId1784600000000 } from '../migrations/1784600000000-NotificationPatientId';
import { AppointmentIndependentBookingNullable1784800000000 } from '../migrations/1784800000000-AppointmentIndependentBookingNullable';
import { InvoiceNumberPerClinicUnique1784900000000 } from '../migrations/1784900000000-InvoiceNumberPerClinicUnique';
import { PatientFileBlobSync1785000000000 } from '../migrations/1785000000000-PatientFileBlobSync';

export const POSTGRES_MIGRATIONS = [
  SeoInfrastructure1700000000001,
  Migration1778951127866,
  Migration1779036761412,
  Migration1779681273006,
  Migration1780739600415,
  Migration1781328589625,
  BranchLocationAndVisibility1781780415382,
  Migration1781849186285,
  Migration1782060615918,
  Migration1782471025559,
  Migration1782474517701,
  SyncDevices1782900000000,
  Migration1782924499469,
  Migration1783496503624,
  Migration1783754843181,
  AuditLogWalletEnumValue1783933938709,
  PatientAccountPassword1784200000000,
  ClinicalRecordVisits1784300000000,
  RecordsBranchScoping1784400000000,
  IndependentDoctorRoleScope1784500000000,
  NotificationPatientId1784600000000,
  AppointmentIndependentBookingNullable1784800000000,
  InvoiceNumberPerClinicUnique1784900000000,
  PatientFileBlobSync1785000000000,
];
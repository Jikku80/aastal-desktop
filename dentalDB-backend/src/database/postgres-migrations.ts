// AUTO-GENERATED explicit migration list — replaces TypeORM's filesystem-glob
// migration discovery (breaks under the bundled Electron build; see
// all-entities.ts for the full explanation). Regenerate, do not hand-edit.
// Used by: data-source.postgres.ts (online/server DB, Postgres driver).
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
];
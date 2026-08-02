import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchesController } from './branch.controller';
import { BranchesService } from './branch.service';
import { Branch } from './entities/branch.entity';
import { DowngradeSelection } from './entities/downgrade-selection.entity';
import { User } from '../users/entities/user.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { UserRole as UserRoleAssignment } from '../rbac/entities/user-role.entity';

@Module({
  imports: [
    // NOTE: Subscription used to be registered here too, purely because
    // BranchesService had an unused `@InjectRepository(Subscription)`
    // constructor param (see branch.service.ts — it was never actually
    // queried). Subscription has no table in the offline/SQLite DataSource
    // (see database/offline-entities.ts) — registering it here was harmless
    // ONLY because nothing ever called a query method on it; the moment any
    // real code path in this module started using it, every quota/branch
    // endpoint would throw EntityMetadataNotFoundError under the desktop
    // build. Branch quota logic must stay driven off Clinic.plan (already
    // the case in getClinicQuota below) — never add a live Subscription
    // dependency back into this offline-capable module.
    TypeOrmModule.forFeature([
      Branch,
      DowngradeSelection,
      User,
      Appointment,
      Invoice,
      Patient,
      Clinic,
      UserRoleAssignment,
    ]),
  ],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
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
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { UserRole as UserRoleAssignment } from '../rbac/entities/user-role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Branch,
      DowngradeSelection,
      User,
      Appointment,
      Invoice,
      Patient,
      Clinic,
      Subscription,
      UserRoleAssignment,
    ]),
  ],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
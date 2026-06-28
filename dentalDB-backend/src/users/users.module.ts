import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { Leave } from '../leave/entities/leave.entity';
import { DoctorCommission } from '../commissions/entities/commission.entity';
import { Branch } from '../branch/entities/branch.entity';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';
import { Role } from '../rbac/entities/role.entity';
import { UserRole } from '../rbac/entities/user-role.entity';
import { DoctorClinicAffiliation } from '../doctor-affiliation/entities/doctor-clinic-affiliation.entity';
import { ShiftsModule } from '../shifts/shifts.module';
import { AuthModule } from '../auth/auth.module';

// Ensure avatars directory exists at startup
mkdir(join(process.cwd(), 'uploads', 'avatars'), { recursive: true }).catch(() => {});

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Appointment, Invoice, Leave, DoctorCommission, Branch, Role, UserRole, DoctorClinicAffiliation]),
    MulterModule.register({}),
    ShiftsModule,
    AuthModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, BranchLockGuard],
  exports: [UsersService],
})
export class UsersModule {}
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance }          from './entities/attendance.entity';
import { AttendanceService }   from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { ShiftsModule }        from '../shifts/shifts.module';
import { User }                from '../users/entities/user.entity';
import { Branch } from '../branch/entities/branch.entity';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attendance, User, Branch]),
    ShiftsModule,
  ],
  controllers: [AttendanceController],
  providers:   [AttendanceService, BranchLockGuard],
  exports:     [AttendanceService],
})
export class AttendanceModule {}

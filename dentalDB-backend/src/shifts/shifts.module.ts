import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shift }              from './entities/shift.entity';
import { ShiftPattern }       from './entities/shift-pattern.entity';
import { ShiftAssignment }    from './entities/shift-assignment.entity';
import { ShiftsService }      from './shifts.service';
import { ShiftResolver }      from './shift-resolver.service';
import { ShiftsController }   from './shifts.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { Branch } from '../branch/entities/branch.entity';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shift, ShiftPattern, ShiftAssignment, Branch]),
    NotificationsModule,
  ],
  controllers: [ShiftsController],
  providers:   [ShiftsService, ShiftResolver, BranchLockGuard],
  exports:     [ShiftsService, ShiftResolver],
})
export class ShiftsModule {}

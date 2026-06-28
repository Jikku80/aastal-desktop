import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Leave }                from './entities/leave.entity';
import { LeaveService }         from './leave.service';
import { LeaveController }      from './leave.controller';
import { NotificationsModule }  from '../notifications/notifications.module';
import { User }                 from '../users/entities/user.entity';
import { Branch } from '../branch/entities/branch.entity';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Leave, User, Branch]),
    NotificationsModule,
  ],
  controllers: [LeaveController],
  providers:   [LeaveService, BranchLockGuard],
  exports:     [LeaveService],
})
export class LeaveModule {}

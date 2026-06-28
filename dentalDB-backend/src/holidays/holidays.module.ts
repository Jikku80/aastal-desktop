import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HolidaysController } from './holidays.controller';
import { HolidaysService } from './holidays.service';
import { Holiday } from './entities/holiday.entity';
import { User } from '../users/entities/user.entity';
import { Branch } from '../branch/entities/branch.entity';
import { UserRole } from '../rbac/entities/user-role.entity';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Holiday, User, Branch, UserRole]),
    AuditModule,
    NotificationsModule,
  ],
  controllers: [HolidaysController],
  providers: [HolidaysService],
  exports: [HolidaysService],
})
export class HolidaysModule {}
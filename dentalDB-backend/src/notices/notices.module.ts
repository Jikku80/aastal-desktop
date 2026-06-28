import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notice } from './entities/notice.entity';
import { User } from '../users/entities/user.entity';
import { Branch } from '../branch/entities/branch.entity';
import { UserRole } from '../rbac/entities/user-role.entity';
import { NoticesService } from './notices.service';
import { NoticesController } from './notices.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notice, User, Branch, UserRole]),
    NotificationsModule,
  ],
  controllers: [NoticesController],
  providers:   [NoticesService],
  exports:     [NoticesService],
})
export class NoticesModule {}

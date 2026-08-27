import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthCacheService } from './auth-cache.service';
import { AuthCache } from './entities/auth-cache.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { User } from '../users/entities/user.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { Branch } from '../branch/entities/branch.entity';
import { SyncMeta } from '../sync/entities/sync-meta.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { DoctorProfile } from '../doctor-profile/entities/doctor-profile.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { RbacModule } from '../rbac/rbac.module';
import { AuditModule } from '../audit/audit.module';
import { SyncModule } from '../sync/sync.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Clinic, Branch, DoctorProfile, AuthCache, SyncMeta, Subscription]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '15m') },
      }),
      inject: [ConfigService],
    }),
    NotificationsModule,
    RbacModule,
    AuditModule,
    SyncModule,
    FinanceModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthCacheService, JwtStrategy, LocalStrategy],
  exports: [AuthService, AuthCacheService],
})
export class AuthModule {}

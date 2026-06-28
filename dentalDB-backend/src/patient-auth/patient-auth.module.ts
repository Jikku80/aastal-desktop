import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PatientAuthController } from './patient-auth.controller';
import { PatientAuthService } from './patient-auth.service';
import { PatientAccount } from './entities/patient-account.entity';
import { PatientAccountLink } from './entities/patient-account-link.entity';
import { PatientRecordConsent } from './entities/patient-record-consent.entity';
import { PatientRecordConsentService } from './patient-record-consent.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([PatientAccount, PatientAccountLink, PatientRecordConsent]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'patient_jwt_secret_change_in_prod'),
        signOptions: { expiresIn: '30d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [PatientAuthController],
  providers: [PatientAuthService, PatientRecordConsentService],
  exports: [PatientAuthService, PatientRecordConsentService],
})
export class PatientAuthModule {}
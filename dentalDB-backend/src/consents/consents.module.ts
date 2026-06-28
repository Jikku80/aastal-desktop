import { Module } from '@nestjs/common';
import { PatientAuthModule } from '../patient-auth/patient-auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsentsController } from './consents.controller';
import { ConsentsService } from './consents.service';
import { ConsentTemplate } from './entities/consent-template.entity';
import { ConsentSubmission } from './entities/consent-submission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConsentTemplate, ConsentSubmission]), PatientAuthModule],
  controllers: [ConsentsController],
  providers: [ConsentsService],
  exports: [ConsentsService],
})
export class ConsentsModule {}

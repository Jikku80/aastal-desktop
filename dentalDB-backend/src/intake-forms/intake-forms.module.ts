import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntakeFormsController } from './intake-forms.controller';
import { IntakeFormsService } from './intake-forms.service';
import { IntakeFormTemplate } from './entities/intake-form-template.entity';
import { IntakeFormSubmission } from './entities/intake-form-submission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([IntakeFormTemplate, IntakeFormSubmission])],
  controllers: [IntakeFormsController],
  providers: [IntakeFormsService],
  exports: [IntakeFormsService],
})
export class IntakeFormsModule {}

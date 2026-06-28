import { Module } from '@nestjs/common';
import { SymptomCheckerController } from './symptom-checker.controller';
import { SymptomCheckerService } from './symptom-checker.service';

@Module({
  controllers: [SymptomCheckerController],
  providers: [SymptomCheckerService],
})
export class SymptomCheckerModule {}

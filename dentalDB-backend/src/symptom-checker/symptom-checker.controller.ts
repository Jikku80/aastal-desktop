import { Controller, Get, Query } from '@nestjs/common';
import { SymptomCheckerService } from './symptom-checker.service';

@Controller('discovery/symptom-search')
export class SymptomCheckerController {
  constructor(private readonly svc: SymptomCheckerService) {}

  @Get()
  search(@Query('q') q: string) {
    const specialties = this.svc.search(q);
    return { query: q, specialties };
  }
}

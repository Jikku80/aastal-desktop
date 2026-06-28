import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { IntakeFormsService } from './intake-forms.service';

@Controller('intake-forms')
export class IntakeFormsController {
  constructor(private readonly svc: IntakeFormsService) {}
  @Post('templates') create(@Body() body: any) { return this.svc.createTemplate(body); }
  @Patch('templates/:id') update(@Param('id') id: string, @Body() body: any) { return this.svc.updateTemplate(id, body); }
  @Delete('templates/:id') delete(@Param('id') id: string) { return this.svc.deleteTemplate(id); }
  @Get('templates') list(@Query() q: any) { return this.svc.getTemplates(q); }
  @Get('templates/:id') get(@Param('id') id: string) { return this.svc.getTemplate(id); }
  @Post('submit') submit(@Body() body: any) { return this.svc.submit(body); }
  @Get('submission/:appointmentId') getSubmission(@Param('appointmentId') id: string) { return this.svc.getSubmission(id); }
}

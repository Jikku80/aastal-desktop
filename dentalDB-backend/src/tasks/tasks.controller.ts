import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Request, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaskStatus } from './entities/task.entity';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private service: TasksService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateTaskDto) {
    return this.service.create(req.user.clinicId, req.user.id, dto);
  }

  @Get()
  findAll(@Request() req, @Query() query: any) {
    return this.service.findAll(req.user.clinicId, query);
  }

  @Get('my')
  findMyTasks(@Request() req, @Query('branchId') branchId?: string) {
    return this.service.findMyTasks(req.user.clinicId, req.user.id, branchId);
  }

  @Get('stats')
  getStats(@Request() req) {
    return this.service.getStats(req.user.clinicId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.service.findOne(req.user.clinicId, id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.service.update(req.user.clinicId, id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { status: TaskStatus; completionNote?: string },
  ) {
    return this.service.updateStatus(req.user.clinicId, id, body.status, body.completionNote);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.service.remove(req.user.clinicId, id);
  }
}

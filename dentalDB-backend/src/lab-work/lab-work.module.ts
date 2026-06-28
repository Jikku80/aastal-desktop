import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabWork } from './entities/lab-work.entity';
import { LabWorkService } from './lab-work.service';
import { LabWorkController } from './lab-work.controller';
import { Branch } from '../branch/entities/branch.entity';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { Expense } from '../expenses/entities/expense.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LabWork, Branch, Expense])],
  controllers: [LabWorkController],
  providers: [LabWorkService, BranchLockGuard, PermissionsGuard],
  exports: [LabWorkService],
})
export class LabWorkModule {}
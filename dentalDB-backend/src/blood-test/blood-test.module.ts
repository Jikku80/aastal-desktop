import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BloodTest } from './entities/blood-test.entity';
import { BloodTestService } from './blood-test.service';
import { BloodTestController } from './blood-test.controller';
import { Branch } from '../branch/entities/branch.entity';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';

@Module({
  imports: [TypeOrmModule.forFeature([BloodTest, Branch])],
  controllers: [BloodTestController],
  providers: [BloodTestService, BranchLockGuard, PermissionsGuard],
  exports: [BloodTestService],
})
export class BloodTestModule {}
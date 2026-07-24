import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { VitalsService } from './vitals.service';
import { Appointment } from './entities/appointment.entity';
import { Vitals } from './entities/vitals.entity';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { BranchesModule } from '../branch/branch.module';
import { BillingModule } from '../billing/billing.module';
import { ServicesModule } from '../services/services.module';
import { Clinic } from '../clinics/entities/clinic.entity';
import { Branch } from '../branch/entities/branch.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { BranchLockGuard } from '../common/guards/branch-lock.guard';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AppointmentsGateway } from './appointments.gateway';

// NOTE: the Socket.IO Redis adapter used to be wired up from inside this
// gateway's own afterInit() hook (SOCKET_IO_ADAPTER_FACTORY). That only
// reliably covered the '/appointments' namespace — '/notifications' and
// '/queue' silently kept the in-memory adapter and would drop cross-instance
// events once horizontally scaled. It's now set up once, globally, in
// main.ts via RedisIoAdapter — see src/common/redis-io.adapter.ts.

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, Vitals, Patient, User, Clinic, Branch, Invoice]),
    NotificationsModule,
    BranchesModule,
    BillingModule,
    ServicesModule,
    JwtModule,
    ConfigModule,
  ],
  controllers: [AppointmentsController],
  providers: [
    AppointmentsService,
    VitalsService,
    BranchLockGuard,
    AppointmentsGateway,
  ],
  exports: [AppointmentsService, VitalsService],
})
export class AppointmentsModule {}

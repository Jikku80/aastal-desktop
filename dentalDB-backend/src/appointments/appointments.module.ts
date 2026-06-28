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
import { BranchLockGuard } from '../common/guards/branch-lock.guard';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppointmentsGateway } from './appointments.gateway';

/**
 * Socket.IO Redis adapter — wired in when REDIS_URL is present so that
 * appointment events are broadcast across all horizontal instances.
 * Without this, a client on instance A would miss events emitted on instance B.
 *
 * The adapter is initialised in AppointmentsGateway.afterInit() via the
 * factory below, keeping the module declaration clean.
 */
export const SOCKET_IO_ADAPTER_FACTORY = 'SOCKET_IO_ADAPTER_FACTORY';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, Vitals, Patient, User, Clinic, Branch]),
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
    {
      provide: SOCKET_IO_ADAPTER_FACTORY,
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (!redisUrl) return null; // dev: no adapter needed
        // Returns a factory that AppointmentsGateway.afterInit() calls with the io server.
        return async (io: any) => {
          const { createAdapter } = await import('@socket.io/redis-adapter');
          const { createClient }  = await import('redis');
          const pub = createClient({ url: redisUrl });
          const sub = pub.duplicate();
          await Promise.all([pub.connect(), sub.connect()]);
          io.adapter(createAdapter(pub, sub));
        };
      },
      inject: [ConfigService],
    },
  ],
  exports: [AppointmentsService, VitalsService],
})
export class AppointmentsModule {}
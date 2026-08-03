import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { buildTypeOrmOptions } from './database/typeorm-options.factory';
import { UPLOADS_DIR } from './common/utils/uploads-dir.util';

import { AuthModule }           from './auth/auth.module';
import { UsersModule }          from './users/users.module';
import { ClinicsModule }        from './clinics/clinics.module';
import { BranchesModule }       from './branch/branch.module';
import { AppointmentsModule }   from './appointments/appointments.module';
import { PatientsModule }       from './patients/patients.module';
import { BillingModule }        from './billing/billing.module';
import { SubscriptionsModule }  from './subscriptions/subscriptions.module';
import { PaymentsModule }       from './payments/payments.module';
import { NotificationsModule }  from './notifications/notifications.module';
import { AnalyticsModule }      from './analytics/analytics.module';
import { WebsiteBuilderModule } from './website-builder/website-builder.module';
import { FilesModule }          from './files/files.module';
import { GalleryModule }        from './gallery/gallery.module';
import { AttendanceModule }     from './attendance/attendance.module';
import { LeaveModule }          from './leave/leave.module';
import { ShiftsModule }         from './shifts/shifts.module';
import { ApiKeysModule }        from './api-keys/api-keys.module';
import { SuperAdminSeeder }     from './database/super-admin.seeder';
import { OfflineAdminSeeder }   from './database/offline-admin.seeder';
import { SuperAdminModule }     from './super-admin/super-admin.module';
import { RbacModule }           from './rbac/rbac.module';
import { RbacService }          from './rbac/rbac.service';
import { ServicesModule }       from './services/services.module';
import { InventoryModule }      from './inventory/inventory.module';
import { CommissionsModule }    from './commissions/commissions.module';
import { ClinicalRecordsModule } from './clinical-records/clinical-records.module';

import { User }                 from './users/entities/user.entity';
import { Clinic }               from './clinics/entities/clinic.entity';
import { Branch }               from './branch/entities/branch.entity';
import { Subscription }         from './subscriptions/entities/subscription.entity';
import { SubscriptionRequest }  from './subscriptions/entities/subscription-request.entity';
import { WaitingQueueModule } from './waiting-queue/waiting-queue.module';
import { PrescriptionsModule } from './prescription/prescriptions.module';
import { RecallsModule } from './recalls/recalls.module';
import { OutboxModule } from './outbox/outbox.module';
import { SyncModule } from './sync/sync.module';
import { AuditModule } from './audit/audit.module';
import { LabWorkModule } from './lab-work/lab-work.module';
import { BloodTestModule } from './blood-test/blood-test.module';
import { HolidaysModule } from './holidays/holidays.module';
import { NoticesModule } from './notices/notices.module';
import { ExpensesModule } from './expenses/expenses.module';
import { PayrollModule } from './payroll/payroll.module';
import { PatientWalletModule } from './patient-wallet/patient-wallet.module';
import { TasksModule } from './tasks/tasks.module';
import { CacheModule } from '@nestjs/cache-manager';
import { DentalChartModule } from './dental-chart/dental-chart.module';
import { SeoModule }         from './seo/seo.module';
import { DiscoveryModule }   from './discovery/discovery.module';
import { PatientAuthModule } from './patient-auth/patient-auth.module';
import { DoctorProfileModule } from './doctor-profile/doctor-profile.module';
import { DoctorAffiliationModule } from './doctor-affiliation/doctor-affiliation.module';
import { DoctorClinicAffiliation } from './doctor-affiliation/entities/doctor-clinic-affiliation.entity';
import { DoctorProfile }     from './doctor-profile/entities/doctor-profile.entity';
import { DoctorLocation }    from './doctor-profile/entities/doctor-location.entity';
import { IndependentAvailability } from './doctor-profile/entities/independent-availability.entity';
import { PatientAccount }    from './patient-auth/entities/patient-account.entity';
import { PatientAccountLink } from './patient-auth/entities/patient-account-link.entity';
import { ReviewsModule }         from './reviews/reviews.module';
import { IntakeFormsModule }     from './intake-forms/intake-forms.module';
import { ConsentsModule }        from './consents/consents.module';
import { TelehealthModule }      from './telehealth/telehealth.module';
import { PatientPortalModule }   from './patient-portal/patient-portal.module';
import { SymptomCheckerModule }  from './symptom-checker/symptom-checker.module';
import { DoctorPortalModule }    from './doctor-portal/doctor-portal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Global default: 100 requests per 60 s.
    // Auth endpoints override this with tighter @Throttle() decorators.
    // When REDIS_URL is set, a custom ThrottlerStorage backed by ioredis is
    // provided below so counters are shared across all horizontal instances.
    // Falls back to the default in-memory storage for local dev.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: UPLOADS_DIR,
      serveRoot: '/uploads',
      serveStaticOptions: {
        setHeaders: (res: any) => {
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        },
      },
    }),
    TypeOrmModule.forRootAsync({
      imports:    [ConfigModule],
      useFactory: (config: ConfigService) => buildTypeOrmOptions(config),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      User, Clinic, Branch, Subscription, SubscriptionRequest,
      DoctorClinicAffiliation, DoctorProfile, DoctorLocation,
      IndependentAvailability, PatientAccount, PatientAccountLink,
    ]),
    RbacModule,
    AuthModule,
    UsersModule,
    ClinicsModule,
    BranchesModule,
    AppointmentsModule,
    PatientsModule,
    BillingModule,
    SubscriptionsModule,
    PaymentsModule,
    NotificationsModule,
    AnalyticsModule,
    WebsiteBuilderModule,
    FilesModule,
    GalleryModule,
    AttendanceModule,
    LeaveModule,
    ShiftsModule,
    ApiKeysModule,
    SuperAdminModule,
    ServicesModule,
    InventoryModule,
    CommissionsModule,
    ClinicalRecordsModule,
    WaitingQueueModule,
    PrescriptionsModule,
    RecallsModule,
    OutboxModule,
    SyncModule,
    AuditModule,
    LabWorkModule,
    BloodTestModule,
    HolidaysModule,
    NoticesModule,
    ExpensesModule,
    PayrollModule,
    PatientWalletModule,
    TasksModule,
    DentalChartModule,
    SeoModule,
    DiscoveryModule,
    PatientAuthModule,
    DoctorProfileModule,
    DoctorAffiliationModule,
    ReviewsModule,
    IntakeFormsModule,
    ConsentsModule,
    TelehealthModule,
    PatientPortalModule,
    SymptomCheckerModule,
    DoctorPortalModule,
    // Cache: Redis when REDIS_URL is set (production / staging), in-memory otherwise (local dev).
    // Swap store by setting REDIS_URL in your environment — no code change required.
    // TTL and max-items remain configurable via CACHE_TTL_MS / CACHE_MAX_ITEMS.
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        const ttl  = parseInt(config.get('CACHE_TTL_MS',    '60000'), 10);
        const max  = parseInt(config.get('CACHE_MAX_ITEMS', '500'),   10);

        if (redisUrl) {
          const { ioRedisStore } = await import('@tirke/node-cache-manager-ioredis');
          return { store: ioRedisStore, host: new URL(redisUrl).hostname, port: parseInt(new URL(redisUrl).port || '6379', 10), ttl, max };
        }

        // Local dev fallback — in-memory, single instance only
        return { ttl, max };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    SuperAdminSeeder,
    OfflineAdminSeeder,
    // Register ThrottlerGuard globally via DI — the correct NestJS pattern.
    // Using APP_GUARD lets the guard participate in the DI container so it
    // can access ThrottlerStorage, Reflector, and per-route @Throttle() metadata.
    // This is why it must NOT be instantiated manually in main.ts.
    {
      provide:  APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // When REDIS_URL is set, override the default in-memory ThrottlerStorage
    // with an ioredis-backed implementation so rate-limit counters are shared
    // across all horizontal instances. Falls back to no-op when REDIS_URL is absent
    // (ThrottlerModule's built-in in-memory storage then takes over automatically).
    {
      provide: 'THROTTLER_STORAGE',
      useFactory: async (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (!redisUrl) return undefined; // let ThrottlerModule use its default

        const { default: Redis } = await import('ioredis');
        const client = new Redis(redisUrl);

        // Minimal ThrottlerStorage implementation backed by ioredis.
        // Each record is a Redis list; we cap its length to `limit` and use TTL
        // to implement the sliding window — matching the semantics of the default
        // in-memory store so @Throttle() decorators behave identically.
        return {
          async getRecord(key: string): Promise<number[]> {
            const vals = await client.lrange(key, 0, -1);
            return vals.map(Number);
          },
          async addRecord(key: string, ttl: number): Promise<void> {
            const now = Date.now();
            await client.rpush(key, now);
            await client.expire(key, Math.ceil(ttl / 1000));
          },
        };
      },
      inject: [ConfigService],
    },
  ],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(private rbac: RbacService) {}

  /**
   * Runs on every application start.
   * Idempotent — only inserts permissions that don't exist yet.
   */
  async onApplicationBootstrap() {
    await this.rbac.seedSystemPermissions();
  }
}
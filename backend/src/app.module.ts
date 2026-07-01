import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { GatewaysModule } from './gateways/gateways.module';

// Common
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { CasesModule } from './modules/cases/cases.module';
import { AiReportingModule } from './modules/ai-reporting/ai-reporting.module';
import { ReportsModule } from './modules/reports/reports.module';
import { VerificationModule } from './modules/verification/verification.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { BillingModule } from './modules/billing/billing.module';
import { MisModule } from './modules/mis/mis.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DemolitionModule } from './modules/demolition/demolition.module';
import { ReportTemplatesModule } from './modules/report-templates/report-templates.module';
import { TravelModule } from './modules/travel/travel.module';
import { LeaveModule } from './modules/leave/leave.module';
import { PropertyIntelligenceModule } from './modules/property-intelligence/property-intelligence.module';

@Module({
  imports: [
    // Config — loads .env
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting — cost: free (Redis not required for basic throttle)
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 10000, limit: 50 },
      { name: 'long', ttl: 60000, limit: 100 },
    ]),

    // Cron jobs
    ScheduleModule.forRoot(),

    // Core
    PrismaModule,
    GatewaysModule,

    // Feature modules
    AuthModule,
    OrganizationsModule,
    CasesModule,
    AiReportingModule,
    ReportsModule,
    VerificationModule,
    EmployeesModule,
    AttendanceModule,
    BillingModule,
    MisModule,
    NotificationsModule,
    DemolitionModule,
    ReportTemplatesModule,
    TravelModule,
    LeaveModule,
    PropertyIntelligenceModule,
  ],

  providers: [
    // Global rate limit guard
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // Global JWT auth guard (all routes protected by default; use @Public() to open)
    { provide: APP_GUARD, useClass: JwtAuthGuard },

    // Global roles guard
    { provide: APP_GUARD, useClass: RolesGuard },

    // Global exception filter
    { provide: APP_FILTER, useClass: AllExceptionsFilter },

    // Global audit log interceptor
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}

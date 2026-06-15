import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

export const AUDIT_ACTION_KEY = 'auditAction';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip, headers } = request;

    // Only audit write operations
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    if (!user) return next.handle();

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: async (data) => {
          try {
            const entityType = this.extractEntityType(url);
            const entityId = data?.id || data?.data?.id || 'unknown';
            const action = this.methodToAction(method);

            await this.prisma.auditLog.create({
              data: {
                userId: user.id,
                action,
                entityType,
                entityId: String(entityId),
                newValue: data ? { response: data } : undefined,
                ipAddress: ip || headers['x-forwarded-for'],
                userAgent: headers['user-agent'],
                metadata: { url, duration: Date.now() - startTime },
              },
            });
          } catch (err) {
            this.logger.error(`Audit log failed: ${err.message}`);
          }
        },
      }),
    );
  }

  private extractEntityType(url: string): string {
    const segments = url.split('/').filter(Boolean);
    const apiIndex = segments.findIndex((s) => s === 'v1');
    return apiIndex >= 0 && segments[apiIndex + 1]
      ? segments[apiIndex + 1].toUpperCase()
      : 'UNKNOWN';
  }

  private methodToAction(method: string): any {
    const map: Record<string, string> = {
      POST: 'CREATE',
      PATCH: 'UPDATE',
      PUT: 'UPDATE',
      DELETE: 'DELETE',
    };
    return map[method] || 'UPDATE';
  }
}

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserRole } from '@prisma/client';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private jwksClient: jwksClient.JwksClient;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const clerkDomain = Buffer.from(
      this.configService.get('clerk.publishableKey', '')
        .replace('pk_test_', '')
        .replace('pk_live_', ''),
      'base64',
    ).toString().replace('$', '');
    // clerkDomain is already the full host, e.g. "relaxing-eagle-77.clerk.accounts.dev"

    this.jwksClient = jwksClient({
      jwksUri: `https://${clerkDomain}/.well-known/jwks.json`,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000, // 10 minutes
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.verifyToken(token);

      let user = await this.prisma.user.findUnique({
        where: { clerkId: payload.sub },
      });

      // Auto-create user on first authenticated request (no webhook needed locally)
      if (!user) {
        user = await this.syncUserFromClerk(payload.sub);
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      // If the JWT has no role claim, the user was linked before this fix.
      // Push the DB role to Clerk now so the next JWT carries it.
      const jwtRole = (payload?.metadata as any)?.role;
      if (!jwtRole && user.clerkId) {
        const secretKey = this.configService.get<string>('clerk.secretKey');
        axios.patch(
          `https://api.clerk.com/v1/users/${user.clerkId}/metadata`,
          { public_metadata: { role: user.role } },
          { headers: { Authorization: `Bearer ${secretKey}` } },
        ).then(() => this.logger.log(`Backfilled role ${user.role} to Clerk for ${user.clerkId}`))
         .catch(e => this.logger.error(`Role backfill failed for ${user.clerkId}: ${e.message}`));
      }

      request.user = user;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.warn(`JWT validation failed: ${err.message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }

  private async syncUserFromClerk(clerkId: string) {
    const secretKey = this.configService.get<string>('clerk.secretKey');
    try {
      const { data: clerkUser } = await axios.get(
        `https://api.clerk.com/v1/users/${clerkId}`,
        { headers: { Authorization: `Bearer ${secretKey}` } },
      );

      const email = clerkUser.email_addresses?.[0]?.email_address ?? `${clerkId}@placeholder.com`;
      const firstName = clerkUser.first_name ?? '';
      const lastName = clerkUser.last_name ?? '';
      const name = [firstName, lastName].filter(Boolean).join(' ') || email;

      // Case-insensitive lookup — admin may have entered email with different casing
      // than Clerk's normalised lowercase address.
      const preCreated = await this.prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' }, clerkId: null },
      });
      if (preCreated) {
        const user = await this.prisma.user.update({
          where: { id: preCreated.id },
          data: { clerkId, avatarUrl: clerkUser.image_url, lastLoginAt: new Date() },
        });
        await this.prisma.employee.updateMany({
          where: { userId: preCreated.id },
          data: { invitationStatus: 'ACCEPTED' },
        });
        // Push the DB role into Clerk public_metadata so the JWT carries the right
        // role claim on the next request. Fire-and-forget — don't block the login.
        axios.patch(
          `https://api.clerk.com/v1/users/${clerkId}/metadata`,
          { public_metadata: { role: user.role } },
          { headers: { Authorization: `Bearer ${secretKey}` } },
        ).then(() => {
          this.logger.log(`Synced role ${user.role} to Clerk for ${email}`);
        }).catch(e => {
          this.logger.error(`Failed to sync role to Clerk for ${email}: ${e.message}`);
        });
        this.logger.log(`Linked Clerk ${clerkId} to pre-created user ${email} (role: ${user.role})`);
        return user;
      }

      try {
        const user = await this.prisma.user.upsert({
          where: { clerkId },
          update: { email, name, avatarUrl: clerkUser.image_url, lastLoginAt: new Date() },
          create: {
            clerkId,
            email,
            name,
            avatarUrl: clerkUser.image_url,
            phone: clerkUser.phone_numbers?.[0]?.phone_number,
            role: UserRole.ADMIN,
            isActive: true,
          },
        });
        this.logger.log(`Auto-synced user ${email} (${clerkId}) from Clerk`);
        return user;
      } catch (upsertErr: any) {
        // P2002 = unique constraint — email exists with a different/null clerkId
        // that the case-insensitive search above didn't catch (e.g. already has a clerkId).
        // Find by email and update the clerkId to this one.
        if (upsertErr.code === 'P2002') {
          const existing = await this.prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
          });
          if (existing) {
            this.logger.warn(`Email conflict for ${email} — updating clerkId to ${clerkId}`);
            return this.prisma.user.update({
              where: { id: existing.id },
              data: { clerkId, avatarUrl: clerkUser.image_url, lastLoginAt: new Date() },
            });
          }
        }
        throw upsertErr;
      }
    } catch (err) {
      this.logger.error(`Failed to sync user ${clerkId} from Clerk: ${err.message}`);
      throw new UnauthorizedException('User not found. Please contact support.');
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers['authorization'];
    if (!authHeader) return null;
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }

  private verifyToken(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded?.header?.kid) {
        return reject(new Error('Invalid token structure'));
      }

      this.jwksClient.getSigningKey(decoded.header.kid, (err, key) => {
        if (err) return reject(err);
        const signingKey = key.getPublicKey();
        jwt.verify(token, signingKey, { algorithms: ['RS256'] }, (verifyErr, verifiedPayload) => {
          if (verifyErr) return reject(verifyErr);
          resolve(verifiedPayload);
        });
      });
    });
  }
}

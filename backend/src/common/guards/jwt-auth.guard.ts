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

      // If admin pre-created this user by email (no clerkId yet), link them
      const preCreated = await this.prisma.user.findFirst({
        where: { email, clerkId: null },
      });
      if (preCreated) {
        const user = await this.prisma.user.update({
          where: { id: preCreated.id },
          data: { clerkId, avatarUrl: clerkUser.image_url, lastLoginAt: new Date() },
        });
        this.logger.log(`Linked Clerk ${clerkId} to pre-created user ${email}`);
        return user;
      }

      const user = await this.prisma.user.upsert({
        where: { clerkId },
        update: { email, name, avatarUrl: clerkUser.image_url },
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

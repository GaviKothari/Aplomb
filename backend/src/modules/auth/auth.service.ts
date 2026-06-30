import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClerkWebhookDto } from './dto/clerk-webhook.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleClerkWebhook(body: ClerkWebhookDto) {
    const { type, data } = body;
    this.logger.log(`Clerk webhook: ${type} for user ${data.id}`);

    if (type === 'user.created' || type === 'user.updated') {
      const email = data.email_addresses?.[0]?.email_address;
      const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || email;
      const role = (data.public_metadata?.role as UserRole) || UserRole.ENGINEER;

      // If admin pre-created this user by email (clerkId still null), link instead of duplicating
      const preCreated = email
        ? await this.prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' }, clerkId: null },
          })
        : null;

      if (preCreated) {
        await this.prisma.user.update({
          where: { id: preCreated.id },
          data: { clerkId: data.id, name, avatarUrl: data.image_url, role },
        });
        // Mark invitation accepted on the employee record
        await this.prisma.employee.updateMany({
          where: { userId: preCreated.id },
          data:  { invitationStatus: 'ACCEPTED' },
        });
        this.logger.log(`Linked Clerk ${data.id} to pre-created user ${email} — invitation accepted`);
      } else {
        await this.prisma.user.upsert({
          where: { clerkId: data.id },
          update: {
            email,
            name,
            avatarUrl: data.image_url,
            phone: data.phone_numbers?.[0]?.phone_number,
            role,
          },
          create: {
            clerkId: data.id,
            email,
            name,
            avatarUrl: data.image_url,
            phone: data.phone_numbers?.[0]?.phone_number,
            role,
          },
        });
      }
    }

    if (type === 'user.deleted') {
      await this.prisma.user.updateMany({
        where: { clerkId: data.id },
        data: { isActive: false },
      });
    }

    return { received: true };
  }
}

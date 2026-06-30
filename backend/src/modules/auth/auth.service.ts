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
      await this.handleUserDeleted(data.id);
    }

    return { received: true };
  }

  private async handleUserDeleted(clerkId: string) {
    const user = await this.prisma.user.findFirst({ where: { clerkId } });
    if (!user) {
      this.logger.warn(`user.deleted: no DB user found for clerkId ${clerkId}`);
      return;
    }

    const employee = await this.prisma.employee.findUnique({ where: { userId: user.id } });

    if (employee) {
      // Delete all child records in FK-safe order
      await this.prisma.payrollEntry.deleteMany({ where: { employeeId: employee.id } });
      await this.prisma.travelExpense.deleteMany({ where: { employeeId: employee.id } });
      await this.prisma.travelLog.deleteMany({ where: { employeeId: employee.id } });
      await this.prisma.leaveRequest.deleteMany({ where: { employeeId: employee.id } });
      await this.prisma.leaveBalance.deleteMany({ where: { employeeId: employee.id } });
      await this.prisma.attendanceRecord.deleteMany({ where: { employeeId: employee.id } });
      await this.prisma.employee.delete({ where: { id: employee.id } });
      this.logger.log(`Deleted employee record and HR data for user ${user.email}`);
    }

    // Anonymise the User row instead of deleting — cases, audit logs, and
    // verifications all reference it and must remain intact for the audit trail.
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        clerkId:   null,
        name:      '[Deleted User]',
        email:     `deleted_${clerkId}@removed`,
        phone:     null,
        avatarUrl: null,
        isActive:  false,
      },
    });

    this.logger.log(`Anonymised user ${user.email} (clerkId ${clerkId}) after Clerk deletion`);
  }
}

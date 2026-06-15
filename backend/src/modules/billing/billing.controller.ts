import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, User } from '@prisma/client';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Post('invoices/generate')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTS)
  @ApiOperation({ summary: 'Auto-generate invoice from completed cases in a period' })
  generate(@Body() body: { organizationId: string; periodStart: string; periodEnd: string }, @CurrentUser() user: User) {
    return this.service.generateInvoice(body.organizationId, body.periodStart, body.periodEnd, user.id);
  }

  @Get('invoices')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTS)
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get('invoices/outstanding')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTS)
  @ApiOperation({ summary: 'Outstanding amounts by bank' })
  getOutstanding() {
    return this.service.getOutstanding();
  }

  @Get('invoices/:id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTS)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('invoices/:id/payment')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTS)
  @ApiOperation({ summary: 'Record payment against an invoice' })
  recordPayment(
    @Param('id') id: string,
    @Body() body: { amount: number; paymentDate: string; mode: string; reference: string },
    @CurrentUser() user: User,
  ) {
    return this.service.recordPayment(id, body.amount, body.paymentDate, body.mode, body.reference, user.id);
  }
}

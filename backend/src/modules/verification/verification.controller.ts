import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, VerificationDecision, User } from '@prisma/client';

@ApiTags('Verification')
@ApiBearerAuth()
@Controller('verification')
export class VerificationController {
  constructor(private readonly service: VerificationService) {}

  @Get('queue')
  @Roles(UserRole.VERIFIER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get verification queue for current verifier' })
  getQueue(@CurrentUser() user: User) {
    return this.service.getQueue(user.id);
  }

  @Post('start')
  @Roles(UserRole.VERIFIER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Start verifying a report' })
  start(@Body() body: { caseId: string; reportId: string }, @CurrentUser() user: User) {
    return this.service.startVerification(body.caseId, body.reportId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get verification detail with split-screen data' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/fields/:fieldKey')
  @Roles(UserRole.VERIFIER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update field-level verification verdict' })
  updateField(
    @Param('id') id: string,
    @Param('fieldKey') fieldKey: string,
    @Body() body: any,
  ) {
    return this.service.updateField(id, fieldKey, body);
  }

  @Post(':id/approve')
  @Roles(UserRole.VERIFIER, UserRole.ADMIN)
  approve(@Param('id') id: string, @Body() body: { comment?: string }, @CurrentUser() user: User) {
    return this.service.decide(id, VerificationDecision.APPROVED, body.comment || 'Approved', user.id);
  }

  @Post(':id/reject')
  @Roles(UserRole.VERIFIER, UserRole.ADMIN)
  reject(@Param('id') id: string, @Body() body: { comment: string }, @CurrentUser() user: User) {
    return this.service.decide(id, VerificationDecision.REJECTED, body.comment, user.id);
  }

  @Post(':id/request-revision')
  @Roles(UserRole.VERIFIER, UserRole.ADMIN)
  requestRevision(@Param('id') id: string, @Body() body: { comment: string }, @CurrentUser() user: User) {
    return this.service.decide(id, VerificationDecision.REVISION_REQUESTED, body.comment, user.id);
  }

  @Post(':id/comments')
  @Roles(UserRole.VERIFIER, UserRole.ADMIN)
  addComment(
    @Param('id') id: string,
    @Body() body: { comment: string; fieldKey?: string },
    @CurrentUser() user: User,
  ) {
    return this.service.addComment(id, user.id, body.comment, body.fieldKey);
  }
}

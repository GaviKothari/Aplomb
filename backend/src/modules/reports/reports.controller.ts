import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, User } from '@prisma/client';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.VERIFIER, UserRole.ACCOUNTS)
  findAll(@Query() query: { status?: string; search?: string; page?: string; limit?: string }) {
    return this.service.findAll(query);
  }

  @Post('from-ai')
  @Roles(UserRole.ENGINEER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create report from AI session output' })
  createFromAi(
    @Body() body: { caseId: string; fields: Record<string, any> },
    @CurrentUser() user: User,
  ) {
    return this.service.createFromAiSession(body.caseId, body.fields, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ENGINEER, UserRole.ADMIN)
  update(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.service.update(id, body);
  }

  @Post(':id/submit')
  @Roles(UserRole.ENGINEER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Submit report for verification' })
  submit(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.submit(id, user.id);
  }

  @Post(':id/pdf')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.VERIFIER)
  @ApiOperation({ summary: 'Generate PDF report' })
  async generatePdf(@Param('id') id: string) {
    const path = await this.service.generatePdf(id);
    return { pdfPath: path };
  }

  @Get('case/:caseId/versions')
  @ApiOperation({ summary: 'Get all report versions for a case' })
  getVersions(@Param('caseId') caseId: string) {
    return this.service.getVersions(caseId);
  }
}

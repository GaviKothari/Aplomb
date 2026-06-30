import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { EmployeesService } from './employees.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, User } from '@prisma/client';

const upload = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.HR)
  create(@Body() dto: any, @CurrentUser() user: User) {
    return this.service.create(dto, user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.COORDINATOR)
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.HR)
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  // ── Invitation ──────────────────────────────────────────────────────────────

  @Post(':id/resend-invite')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Resend Clerk invitation email to employee' })
  resendInvitation(@Param('id') id: string) {
    return this.service.resendInvitation(id);
  }

  /** @deprecated Use resend-invite — kept for backward compat */
  @Post(':id/resend-welcome')
  @Roles(UserRole.ADMIN, UserRole.HR)
  resendWelcome(@Param('id') id: string) {
    return this.service.resendInvitation(id);
  }

  // ── Status ──────────────────────────────────────────────────────────────────

  @Post(':id/suspend')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Suspend employee — disables Clerk account immediately' })
  suspend(@Param('id') id: string) {
    return this.service.suspend(id);
  }

  @Post(':id/activate')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Re-activate a suspended employee' })
  activate(@Param('id') id: string) {
    return this.service.activate(id);
  }

  /** @deprecated Use suspend */
  @Post(':id/deactivate')
  @Roles(UserRole.ADMIN, UserRole.HR)
  deactivate(@Param('id') id: string) {
    return this.service.suspend(id);
  }

  // ── Queries ─────────────────────────────────────────────────────────────────

  @Get(':id/cases')
  @Roles(UserRole.ADMIN, UserRole.HR)
  getCaseCount(@Param('id') id: string) {
    return this.service.getCaseCount(id);
  }

  @Get(':id/attendance')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Get employee attendance summary for a month' })
  getAttendance(
    @Param('id') id: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.service.getAttendanceSummary(
      id,
      +month || new Date().getMonth() + 1,
      +year  || new Date().getFullYear(),
    );
  }

  // ── Documents ───────────────────────────────────────────────────────────────

  @Get(':id/documents')
  @Roles(UserRole.ADMIN, UserRole.HR)
  getDocuments(@Param('id') id: string) {
    return this.service.getDocumentUrls(id);
  }

  @Post(':id/documents')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(upload)
  uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
  ) {
    return this.service.uploadDocument(id, file, type);
  }

  @Delete(':id/documents/:type')
  @Roles(UserRole.ADMIN, UserRole.HR)
  deleteDocument(@Param('id') id: string, @Param('type') type: string) {
    return this.service.deleteDocument(id, type);
  }
}

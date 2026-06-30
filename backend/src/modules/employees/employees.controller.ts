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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
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

  @Post(':id/deactivate')
  @Roles(UserRole.ADMIN, UserRole.HR)
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }

  @Post(':id/activate')
  @Roles(UserRole.ADMIN, UserRole.HR)
  activate(@Param('id') id: string) {
    return this.service.activate(id);
  }

  @Post(':id/resend-welcome')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Resend welcome email + SMS to an employee' })
  resendWelcome(@Param('id') id: string) {
    return this.service.resendWelcome(id);
  }

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
      +year || new Date().getFullYear(),
    );
  }

  @Get(':id/documents')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Get signed URLs for all employee documents' })
  getDocuments(@Param('id') id: string) {
    return this.service.getDocumentUrls(id);
  }

  @Post(':id/documents')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Upload an employee document (aadhaar/pan/drivingLicense/agreement/photo)' })
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
  @ApiOperation({ summary: 'Delete an employee document' })
  deleteDocument(@Param('id') id: string, @Param('type') type: string) {
    return this.service.deleteDocument(id, type);
  }
}

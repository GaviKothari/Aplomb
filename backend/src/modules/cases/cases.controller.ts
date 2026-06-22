import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseInterceptors, UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseStatusDto } from './dto/update-case-status.dto';
import { AssignCaseDto } from './dto/assign-case.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, User } from '@prisma/client';

@ApiTags('Cases')
@ApiBearerAuth()
@Controller('cases')
export class CasesController {
  constructor(private readonly service: CasesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @ApiOperation({ summary: 'Create a single case' })
  create(@Body() dto: CreateCaseDto, @CurrentUser() user: User) {
    return this.service.create(dto, user.id);
  }

  @Post('bulk')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @ApiOperation({ summary: 'Bulk import cases from parsed CSV/Excel rows' })
  bulkCreate(@Body() body: { rows: CreateCaseDto[] }, @CurrentUser() user: User) {
    return this.service.bulkCreate(body.rows, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List cases with filters and pagination' })
  findAll(@Query() query: any, @CurrentUser() user: User) {
    // Engineers only see their own cases
    if (user.role === UserRole.ENGINEER) {
      query.engineerId = user.id;
    }
    return this.service.findAll(query);
  }

  @Get('nearby')
  @Roles(UserRole.ENGINEER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get nearby assigned cases by GPS' })
  findNearby(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius: number,
    @CurrentUser() user: User,
  ) {
    return this.service.findNearby(+lat, +lng, +(radius || 10), user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get case detail' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update case status (enforces valid transitions)' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCaseStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.service.updateStatus(id, dto, user.id, user.role);
  }

  @Patch(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @ApiOperation({ summary: 'Assign engineer and verifier' })
  assign(
    @Param('id') id: string,
    @Body() dto: AssignCaseDto,
    @CurrentUser() user: User,
  ) {
    return this.service.assign(id, dto, user.id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get case status history (audit trail)' })
  getHistory(@Param('id') id: string) {
    return this.service.getHistory(id);
  }

  @Post(':id/site-visit/start')
  @Roles(UserRole.ENGINEER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark site visit started with GPS' })
  startSiteVisit(
    @Param('id') id: string,
    @Body() body: { lat: number; lng: number },
    @CurrentUser() user: User,
  ) {
    return this.service.startSiteVisit(id, body.lat, body.lng, user.id);
  }

  @Post(':id/site-visit/end')
  @Roles(UserRole.ENGINEER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark site visit ended with GPS' })
  endSiteVisit(
    @Param('id') id: string,
    @Body() body: { lat: number; lng: number },
    @CurrentUser() user: User,
  ) {
    return this.service.endSiteVisit(id, body.lat, body.lng, user.id);
  }

  @Post(':id/field-data')
  @Roles(UserRole.ENGINEER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Save engineer field observations (creates/updates draft report)' })
  submitFieldData(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @CurrentUser() user: User,
  ) {
    return this.service.submitFieldData(id, body, user.id);
  }

  @Post(':id/photos')
  @Roles(UserRole.ENGINEER, UserRole.ADMIN)
  @UseInterceptors(FilesInterceptor('photos', 20, { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload site visit photos' })
  uploadPhotos(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: User,
  ) {
    return this.service.uploadPhotos(id, files ?? [], user.id);
  }

  @Get(':id/report')
  @ApiOperation({ summary: 'Get the draft/latest report for a case' })
  getCaseReport(@Param('id') id: string) {
    return this.service.getCaseReport(id);
  }
}

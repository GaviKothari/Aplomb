import {
  Controller, Get, Post, Delete, Body, Param, Query,
  UseInterceptors, UploadedFile, Res, HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { ReportTemplatesService } from './report-templates.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, User } from '@prisma/client';

@ApiTags('Report Templates')
@ApiBearerAuth()
@Controller('report-templates')
export class ReportTemplatesController {
  constructor(private readonly service: ReportTemplatesService) {}

  @Get('placeholders')
  @ApiOperation({ summary: 'List all {{placeholder}} variables available for templates' })
  placeholders() {
    return this.service.placeholders();
  }

  @Get()
  @ApiOperation({ summary: 'List all report templates' })
  list(@Query() query: { organizationId?: string; propertyType?: string }) {
    return this.service.list(query);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a template record' })
  create(@Body() body: any, @CurrentUser() user: User) {
    return this.service.create({ ...body, uploadedById: user.id });
  }

  @Post(':id/upload')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('template', { limits: { fileSize: 50 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload the .xlsx file for this template' })
  upload(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.service.uploadExcel(id, file.buffer, file.originalname);
  }

  @Get('for-case/:caseId')
  @ApiOperation({ summary: 'Get the best matching template for a case' })
  findForCase(@Param('caseId') caseId: string) {
    return this.service.findForCase(caseId);
  }

  @Post('generate/:caseId')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.VERIFIER)
  @ApiOperation({ summary: 'Generate PDF for a case using its matched Excel template' })
  async generatePdf(@Param('caseId') caseId: string, @Res() res: Response) {
    const template = await this.service.findForCase(caseId);
    if (!template?.s3Key) {
      res.status(404).json({ message: 'No Excel template found for this case. Upload one in System → Report Templates.' });
      return;
    }
    const data = await this.service.buildDataForCase(caseId);
    const pdfBuffer = await this.service.fillAndGeneratePdf(template.s3Key, data);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${caseId}.pdf"`);
    res.send(pdfBuffer);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(200)
  remove(@Param('id') id: string) {
    return this.service.delete(id);
  }
}

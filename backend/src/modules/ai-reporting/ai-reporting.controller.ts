import {
  Controller, Post, Get, Body, Param, Query,
  UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { AiReportingService } from './ai-reporting.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, User } from '@prisma/client';

@ApiTags('AI Reporting')
@ApiBearerAuth()
@Controller('ai')
export class AiReportingController {
  constructor(private readonly service: AiReportingService) {}

  @Post('sessions')
  @Roles(UserRole.ENGINEER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Start AI reporting session for a case' })
  startSession(
    @Body() body: { caseId: string; language?: string },
    @CurrentUser() user: User,
  ) {
    return this.service.startSession(body.caseId, user.id, body.language);
  }

  @Post('sessions/:id/message')
  @Roles(UserRole.ENGINEER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Send text message to AI assistant' })
  sendMessage(@Param('id') id: string, @Body() body: { content: string }) {
    return this.service.sendMessage(id, body.content);
  }

  @Post('sessions/:id/voice')
  @Roles(UserRole.ENGINEER, UserRole.ADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Send voice message — Whisper transcribes and AI responds' })
  @UseInterceptors(FileInterceptor('audio'))
  async sendVoice(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({ validators: [new MaxFileSizeValidator({ maxSize: 25 * 1024 * 1024 })] }),
    ) file: Express.Multer.File,
  ) {
    return this.service.transcribeVoice(id, file.buffer, file.mimetype);
  }

  @Post('sessions/:id/generate')
  @Roles(UserRole.ENGINEER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Generate structured report from completed session' })
  generateReport(@Param('id') id: string) {
    return this.service.generateReport(id);
  }

  @Post('analyze-photo')
  @Roles(UserRole.ENGINEER, UserRole.ADMIN, UserRole.VERIFIER)
  @ApiOperation({ summary: 'AI photo quality and content analysis' })
  analyzePhoto(@Body() body: { imageBase64: string; caseId: string }) {
    return this.service.analyzePhoto(body.imageBase64, body.caseId);
  }
}

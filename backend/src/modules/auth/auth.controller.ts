import { Controller, Post, Body, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ClerkWebhookDto } from './dto/clerk-webhook.dto';
import { User } from '@prisma/client';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Clerk calls this webhook when a user is created/updated
  @Public()
  @Post('webhook/clerk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clerk webhook handler' })
  async clerkWebhook(@Body() body: ClerkWebhookDto) {
    return this.authService.handleClerkWebhook(body);
  }

  // Returns current authenticated user profile
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser() user: User) {
    return { success: true, data: user };
  }

  // Health check — public
  @Public()
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}

import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AssignCaseDto {
  @ApiPropertyOptional() @IsOptional() @IsString() engineerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() verifierId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() coordinatorId?: string;
}

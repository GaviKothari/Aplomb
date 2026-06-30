import {
  IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CasePriority } from '@prisma/client';

export class CreateCaseDto {
  @ApiProperty() @IsString() organizationId: string;
  @ApiProperty() @IsString() caseType: string;
  @ApiProperty() @IsString() propertyType: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(CasePriority) priority?: CasePriority;

  // Property
  @ApiProperty() @IsString() propertyAddress: string;
  @ApiProperty() @IsString() propertyCity: string;
  @ApiProperty() @IsString() propertyState: string;
  @ApiProperty() @IsString() propertyPincode: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() googleMapsUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() surveyNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() propertyArea?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() propertyAreaUnit?: string;

  // Owner
  @ApiProperty() @IsString() ownerName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ownerContact?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ownerEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() coOwnerName?: string;

  // Bank reference
  @ApiPropertyOptional() @IsOptional() @IsString() loanAccountNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() applicationNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankContactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankContactEmail?: string;

  // Assignment
  @ApiPropertyOptional() @IsOptional() @IsString() engineerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() verifierId?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() siteVisitDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() slaDeadline?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

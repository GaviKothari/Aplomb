import { Module } from '@nestjs/common';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { GatewaysModule } from '../../gateways/gateways.module';
import { StorageService } from '../../common/services/storage.service';

@Module({
  imports: [GatewaysModule],
  controllers: [CasesController],
  providers: [CasesService, StorageService],
  exports: [CasesService],
})
export class CasesModule {}

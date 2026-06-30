import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { StorageService } from '../../common/services/storage.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ConfigModule, NotificationsModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, StorageService],
  exports: [EmployeesService],
})
export class EmployeesModule {}

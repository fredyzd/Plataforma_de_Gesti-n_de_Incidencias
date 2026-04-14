import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { IncidentsModule } from '../incidents/incidents.module';

@Module({
  imports: [IncidentsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}

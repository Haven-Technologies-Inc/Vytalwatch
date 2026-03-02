/**
 * VitalWatch InfluxDB Module
 * Time-series database for vitals data
 */

import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InfluxDBService } from './influxdb.service';
import { InfluxDBController } from './influxdb.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [InfluxDBController],
  providers: [InfluxDBService],
  exports: [InfluxDBService],
})
export class InfluxDBModule {}

/**
 * VitalWatch InfluxDB Service
 * Time-series database operations for vitals
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InfluxDB, Point, WriteApi, QueryApi } from '@influxdata/influxdb-client';

export interface VitalPoint {
  patientId: string;
  deviceId?: string;
  type: string;
  values: Record<string, number>;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  timestamp?: Date;
  metadata?: Record<string, string>;
}

export interface VitalQuery {
  patientId: string;
  type?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
}

@Injectable()
export class InfluxDBService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InfluxDBService.name);
  private client: InfluxDB;
  private writeApi: WriteApi;
  private queryApi: QueryApi;
  private org: string;
  private bucket: string;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('INFLUXDB_URL') || 'http://localhost:8086';
    const token = this.configService.get<string>('INFLUXDB_TOKEN') || '';
    this.org = this.configService.get<string>('INFLUXDB_ORG') || 'vitalwatch';
    this.bucket = this.configService.get<string>('INFLUXDB_BUCKET') || 'vitals';

    this.client = new InfluxDB({ url, token });
    this.writeApi = this.client.getWriteApi(this.org, this.bucket, 'ns');
    this.queryApi = this.client.getQueryApi(this.org);
  }

  async onModuleInit() {
    this.logger.log('InfluxDB client initialized');
  }

  async onModuleDestroy() {
    await this.writeApi.close();
    this.logger.log('InfluxDB connection closed');
  }

  async writeVital(vital: VitalPoint): Promise<void> {
    const point = new Point('vital_reading')
      .tag('patientId', vital.patientId)
      .tag('type', vital.type)
      .tag('status', vital.status)
      .stringField('unit', vital.unit);

    if (vital.deviceId) {
      point.tag('deviceId', vital.deviceId);
    }

    // Add all values as fields
    Object.entries(vital.values).forEach(([key, value]) => {
      point.floatField(key, value);
    });

    // Add metadata tags
    if (vital.metadata) {
      Object.entries(vital.metadata).forEach(([key, value]) => {
        point.tag(key, value);
      });
    }

    if (vital.timestamp) {
      point.timestamp(vital.timestamp);
    }

    this.writeApi.writePoint(point);
    await this.writeApi.flush();

    this.logger.debug(`Wrote vital: ${vital.type} for patient ${vital.patientId}`);
  }

  async writeVitals(vitals: VitalPoint[]): Promise<void> {
    for (const vital of vitals) {
      const point = new Point('vital_reading')
        .tag('patientId', vital.patientId)
        .tag('type', vital.type)
        .tag('status', vital.status)
        .stringField('unit', vital.unit);

      if (vital.deviceId) {
        point.tag('deviceId', vital.deviceId);
      }

      Object.entries(vital.values).forEach(([key, value]) => {
        point.floatField(key, value);
      });

      if (vital.metadata) {
        Object.entries(vital.metadata).forEach(([key, value]) => {
          point.tag(key, value);
        });
      }

      if (vital.timestamp) {
        point.timestamp(vital.timestamp);
      }

      this.writeApi.writePoint(point);
    }

    await this.writeApi.flush();
    this.logger.debug(`Wrote ${vitals.length} vital readings`);
  }

  async queryVitals(query: VitalQuery): Promise<any[]> {
    const startTime = query.startTime || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
    const endTime = query.endTime || new Date();
    const limit = query.limit || 1000;

    let fluxQuery = `
      from(bucket: "${this.bucket}")
        |> range(start: ${startTime.toISOString()}, stop: ${endTime.toISOString()})
        |> filter(fn: (r) => r._measurement == "vital_reading")
        |> filter(fn: (r) => r.patientId == "${query.patientId}")
    `;

    if (query.type) {
      fluxQuery += `|> filter(fn: (r) => r.type == "${query.type}")`;
    }

    fluxQuery += `
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: ${limit})
    `;

    const results: any[] = [];

    return new Promise((resolve, reject) => {
      this.queryApi.queryRows(fluxQuery, {
        next(row, tableMeta) {
          const record = tableMeta.toObject(row);
          results.push({
            id: `${record._time}_${record.patientId}_${record.type}`,
            patientId: record.patientId,
            deviceId: record.deviceId || null,
            type: record.type,
            status: record.status,
            unit: record.unit,
            timestamp: new Date(record._time),
            values: {
              systolic: record.systolic,
              diastolic: record.diastolic,
              heartRate: record.heartRate,
              glucose: record.glucose,
              spo2: record.spo2,
              weight: record.weight,
              temperature: record.temperature,
            },
          });
        },
        error(error) {
          reject(error);
        },
        complete() {
          resolve(results);
        },
      });
    });
  }

  async getLatestVitals(patientId: string): Promise<Record<string, any>> {
    const types = ['blood_pressure', 'glucose', 'spo2', 'weight', 'heart_rate', 'temperature'];
    const latest: Record<string, any> = {};

    for (const type of types) {
      const results = await this.queryVitals({
        patientId,
        type,
        limit: 1,
      });

      if (results.length > 0) {
        latest[type] = results[0];
      }
    }

    return latest;
  }

  async getVitalTrends(
    patientId: string,
    type: string,
    days: number = 30,
    aggregateWindow: string = '1h'
  ): Promise<any[]> {
    const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const fluxQuery = `
      from(bucket: "${this.bucket}")
        |> range(start: ${startTime.toISOString()})
        |> filter(fn: (r) => r._measurement == "vital_reading")
        |> filter(fn: (r) => r.patientId == "${patientId}")
        |> filter(fn: (r) => r.type == "${type}")
        |> aggregateWindow(every: ${aggregateWindow}, fn: mean, createEmpty: false)
        |> yield(name: "mean")
    `;

    const results: any[] = [];

    return new Promise((resolve, reject) => {
      this.queryApi.queryRows(fluxQuery, {
        next(row, tableMeta) {
          const record = tableMeta.toObject(row);
          results.push({
            timestamp: new Date(record._time),
            field: record._field,
            value: record._value,
          });
        },
        error(error) {
          reject(error);
        },
        complete() {
          resolve(results);
        },
      });
    });
  }

  async getVitalSummary(
    patientId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    type?: string,
  ): Promise<any[]> {
    const periodMap: Record<string, { range: string; window: string }> = {
      daily: { range: '-1d', window: '1h' },
      weekly: { range: '-7d', window: '6h' },
      monthly: { range: '-30d', window: '1d' },
    };

    const { range, window } = periodMap[period];

    let fluxQuery = `
      from(bucket: "${this.bucket}")
        |> range(start: ${range})
        |> filter(fn: (r) => r._measurement == "vital_reading")
        |> filter(fn: (r) => r.patientId == "${patientId}")
    `;

    if (type) {
      fluxQuery += `|> filter(fn: (r) => r.type == "${type}")`;
    }

    fluxQuery += `
        |> aggregateWindow(every: ${window}, fn: mean, createEmpty: false)
        |> yield(name: "mean")
    `;

    const results: any[] = [];

    return new Promise((resolve, reject) => {
      this.queryApi.queryRows(fluxQuery, {
        next(row, tableMeta) {
          const record = tableMeta.toObject(row);
          results.push({
            timestamp: new Date(record._time),
            field: record._field,
            value: record._value,
            type: record.type,
            patientId: record.patientId,
          });
        },
        error(error) {
          reject(error);
        },
        complete() {
          resolve(results);
        },
      });
    });
  }

  async deletePatientVitals(patientId: string): Promise<void> {
    // Note: Delete API requires InfluxDB 2.x with delete permissions
    // For now, log the request - implement when delete API is configured
    this.logger.log(`Delete request for patient ${patientId} vitals`);
    // TODO: Implement delete when InfluxDB delete API is properly configured
  }
}

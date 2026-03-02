import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull, Not, MoreThan } from 'typeorm';
import { TenoviService } from './tenovi.service';
import { TenoviHwiDevice, TenoviDeviceStatus } from './entities/tenovi-hwi-device.entity';
import { AlertsService } from '../alerts/alerts.service';
import { AlertSeverity, AlertType } from '../alerts/entities/alert.entity';
import { VitalReading } from '../vitals/entities/vital-reading.entity';
import { Enrollment, EnrollmentStatus } from '../enrollments/entities/enrollment.entity';
import { Task, TaskType, TaskPriority, TaskStatus } from '../tasks/entities/task.entity';

@Injectable()
export class TenoviSyncService {
  private readonly logger = new Logger(TenoviSyncService.name);

  constructor(
    private readonly tenoviService: TenoviService,
    private readonly alertsService: AlertsService,
    @InjectRepository(TenoviHwiDevice) private readonly deviceRepo: Repository<TenoviHwiDevice>,
    @InjectRepository(VitalReading) private readonly vitalRepo: Repository<VitalReading>,
    @InjectRepository(Enrollment) private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
  ) {}

  @Cron('0 */15 * * * *')
  async syncMeasurements(): Promise<void> {
    this.logger.log('Running Tenovi measurement sync...');
    const devices = await this.deviceRepo.find({
      where: { status: TenoviDeviceStatus.ACTIVE, patientId: Not(IsNull()) },
    });
    const since = new Date(Date.now() - 20 * 60 * 1000);
    for (const d of devices) {
      try {
        const res = await this.tenoviService.getDeviceMeasurements(d.hwiDeviceId, {
          startDate: since.toISOString(),
        });
        if (res.results?.length) await this.tenoviService.processMeasurementWebhook(res.results);
      } catch (e) {
        this.logger.warn(`Sync error ${d.hwiDeviceId}`);
      }
    }
  }

  @Cron('0 0 * * * *')
  async checkDeviceConnectivity(): Promise<void> {
    const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const offline = await this.deviceRepo.find({
      where: {
        status: TenoviDeviceStatus.ACTIVE,
        lastMeasurement: LessThan(threshold),
        patientId: Not(IsNull()),
      },
    });
    for (const d of offline) {
      await this.alertsService.create({
        patientId: d.patientId,
        type: AlertType.DEVICE_OFFLINE,
        severity: AlertSeverity.MEDIUM,
        title: 'Device Offline',
        message: `Device ${d.hwiDeviceId} offline 24+ hours`,
      });
    }
  }

  @Cron('0 0 6 * * *')
  async detectMeasurementGaps(): Promise<void> {
    this.logger.log('Detecting measurement gaps...');
    const threshold = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const enrollments = await this.enrollmentRepo.find({
      where: { status: EnrollmentStatus.ACTIVE },
    });
    let tasksCreated = 0;
    for (const e of enrollments) {
      const recent = await this.vitalRepo.findOne({
        where: { patientId: e.patientId, createdAt: MoreThan(threshold) },
      });
      if (!recent) {
        const existing = await this.taskRepo.findOne({
          where: { patientId: e.patientId, type: TaskType.OUTREACH, status: TaskStatus.PENDING },
        });
        if (!existing) {
          await this.taskRepo.save(
            this.taskRepo.create({
              type: TaskType.OUTREACH,
              priority: TaskPriority.HIGH,
              status: TaskStatus.PENDING,
              patientId: e.patientId,
              clinicId: e.clinicId,
              title: 'No readings in 3+ days - Patient outreach required',
            }),
          );
          tasksCreated++;
        }
      }
    }
    this.logger.log(`Created ${tasksCreated} outreach tasks for measurement gaps`);
  }

  @Cron('0 0 7 * * *')
  async syncDeviceInventory(): Promise<void> {
    this.logger.log('Syncing device inventory from Tenovi...');
    try {
      await this.tenoviService.syncAllDevices();
      this.logger.log('Device inventory sync complete');
    } catch (e) {
      this.logger.error(`Device inventory sync failed: ${e.message}`);
    }
  }
}

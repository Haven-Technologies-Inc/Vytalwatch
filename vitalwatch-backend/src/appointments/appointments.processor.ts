import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

@Processor('appointments')
export class AppointmentsProcessor {
  private readonly logger = new Logger(AppointmentsProcessor.name);

  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Process('send-reminder')
  async handleSendReminder(job: Job) {
    const { appointmentId, reminderType } = job.data;

    this.logger.log(`Processing ${reminderType} reminder for appointment ${appointmentId}`);

    try {
      await this.appointmentsService.sendReminder(appointmentId, reminderType);
      this.logger.log(`Successfully sent ${reminderType} reminder for appointment ${appointmentId}`);
    } catch (error) {
      this.logger.error(`Failed to send ${reminderType} reminder for appointment ${appointmentId}`, error);
      throw error;
    }
  }
}

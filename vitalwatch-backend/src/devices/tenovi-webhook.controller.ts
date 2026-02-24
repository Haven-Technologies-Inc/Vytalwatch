import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
  Get,
  Param,
  Query,
  UseGuards,
  Patch,
  Delete,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { TenoviService } from './tenovi.service';
import { TenoviMeasurementWebhookDto, TenoviSpecialOrderWebhookDto } from './dto/tenovi.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('webhooks/tenovi')
export class TenoviWebhookController {
  private readonly logger = new Logger(TenoviWebhookController.name);

  constructor(
    private readonly tenoviService: TenoviService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleMeasurementWebhook(
    @Body() payload: TenoviMeasurementWebhookDto | TenoviMeasurementWebhookDto[],
    @Headers('authorization') authHeader?: string,
    @Headers('x-tenovi-signature') signature?: string,
  ) {
    // Verify webhook authentication
    const webhookSecret = this.configService.get('tenovi.webhookSecret');
    const webhookAuthKey = this.configService.get('tenovi.webhookAuthKey');

    // Check signature-based auth
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (signature !== expectedSignature) {
        this.logger.warn('Invalid Tenovi webhook signature');
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    // Check header-based auth
    if (webhookAuthKey && authHeader !== webhookAuthKey) {
      this.logger.warn('Invalid Tenovi webhook authorization header');
      throw new UnauthorizedException('Invalid authorization');
    }

    const measurements = Array.isArray(payload) ? payload : [payload];
    this.logger.log(
      `Received Tenovi webhook with ${measurements.length} measurement(s)`,
    );

    try {
      await this.tenoviService.processMeasurementWebhook(payload);
      return { 
        received: true, 
        processed: measurements.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error processing Tenovi webhook', error);
      // Return 200 to prevent retries for processing errors
      return { 
        received: true, 
        error: 'Processing error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('fulfillment')
  @HttpCode(HttpStatus.OK)
  async handleFulfillmentWebhook(
    @Body() payload: any,
    @Headers('authorization') authHeader?: string,
  ) {
    const webhookAuthKey = this.configService.get('tenovi.webhookAuthKey');

    if (webhookAuthKey && authHeader !== webhookAuthKey) {
      throw new UnauthorizedException('Invalid authorization');
    }

    this.logger.log('Received Tenovi fulfillment webhook');

    try {
      // Process fulfillment status updates
      const fulfillmentData = Array.isArray(payload) ? payload : [payload];
      const processed: string[] = [];

      for (const item of fulfillmentData) {
        if (item.hwi_device_id || item.hardware_uuid) {
          await this.tenoviService.updateDeviceShippingStatus({
            hwiDeviceId: item.hwi_device_id,
            hardwareUuid: item.hardware_uuid,
            status: item.status || item.fulfillment_status,
            trackingNumber: item.tracking_number,
            carrier: item.carrier,
            shippedAt: item.shipped_at ? new Date(item.shipped_at) : undefined,
            deliveredAt: item.delivered_at ? new Date(item.delivered_at) : undefined,
            orderId: item.order_id,
          });
          processed.push(item.hwi_device_id || item.hardware_uuid);
        }
      }

      return { 
        received: true,
        type: 'fulfillment',
        processed: processed.length,
        deviceIds: processed,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error processing fulfillment webhook', error);
      return { 
        received: true,
        error: 'Processing error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('special-order')
  @HttpCode(HttpStatus.OK)
  async handleSpecialOrderWebhook(
    @Body() payload: TenoviSpecialOrderWebhookDto | TenoviSpecialOrderWebhookDto[],
    @Headers('authorization') authHeader?: string,
  ) {
    const webhookAuthKey = this.configService.get('tenovi.webhookAuthKey');

    if (webhookAuthKey && authHeader !== webhookAuthKey) {
      throw new UnauthorizedException('Invalid authorization');
    }

    this.logger.log('Received Tenovi special order webhook');

    try {
      const orders = Array.isArray(payload) ? payload : [payload];
      const processed: string[] = [];

      for (const order of orders) {
        await this.tenoviService.processSpecialOrderWebhook(order);
        processed.push(order.order_id || order.order_number || 'unknown');
      }

      return {
        received: true,
        type: 'special_order',
        processed: processed.length,
        orderIds: processed,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error processing special order webhook', error);
      return {
        received: true,
        error: 'Processing error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

@Controller('tenovi')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenoviController {
  private readonly logger = new Logger(TenoviController.name);

  constructor(private readonly tenoviService: TenoviService) {}

  // Gateway endpoints
  @Get('gateways/:uuid')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async getGateway(@Param('uuid') uuid: string) {
    return this.tenoviService.findGatewayByUuid(uuid);
  }

  @Get('gateways/organization/:organizationId')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async getOrganizationGateways(@Param('organizationId') organizationId: string) {
    return this.tenoviService.findGatewaysByOrganization(organizationId);
  }

  @Post('gateways/:uuid/sync')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async syncGateway(@Param('uuid') uuid: string) {
    return this.tenoviService.syncGatewayFromApi(uuid);
  }

  // HWI Device endpoints
  @Get('devices')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async listDevices(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.tenoviService.listHwiDevices(page, limit);
  }

  @Get('devices/:hwiDeviceId')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async getDevice(@Param('hwiDeviceId') hwiDeviceId: string) {
    return this.tenoviService.findHwiDeviceByHwiId(hwiDeviceId);
  }

  @Get('devices/patient/:patientId')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER, UserRole.PATIENT)
  async getPatientDevices(@Param('patientId') patientId: string) {
    return this.tenoviService.findHwiDevicesByPatient(patientId);
  }

  @Get('devices/organization/:organizationId')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async getOrganizationDevices(@Param('organizationId') organizationId: string) {
    return this.tenoviService.findHwiDevicesByOrganization(organizationId);
  }

  @Post('devices/:hwiDeviceId/sync')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async syncDevice(@Param('hwiDeviceId') hwiDeviceId: string) {
    return this.tenoviService.syncHwiDeviceFromApi(hwiDeviceId);
  }

  @Post('devices/:hwiDeviceId/assign')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async assignDevice(
    @Param('hwiDeviceId') hwiDeviceId: string,
    @Body() body: { patientId: string; organizationId?: string },
  ) {
    return this.tenoviService.assignHwiDeviceToPatient(
      hwiDeviceId,
      body.patientId,
      body.organizationId,
    );
  }

  // Device Types
  @Get('device-types')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async listDeviceTypes() {
    return this.tenoviService.listDeviceTypes();
  }

  // Orders
  @Get('orders')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async listOrders(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.tenoviService.listOrders(page, limit);
  }

  @Get('orders/:orderId')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getOrder(@Param('orderId') orderId: string) {
    return this.tenoviService.getOrder(orderId);
  }

  // Sync operations
  @Post('sync')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async syncAllDevices(@Body() body?: { organizationId?: string }) {
    return this.tenoviService.syncAllDevices(body?.organizationId);
  }

  // Statistics
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async getStats(@Query('organizationId') organizationId?: string) {
    return this.tenoviService.getDeviceStats(organizationId);
  }

  // Fulfillment - Create device order for patient
  @Post('fulfillment/create')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async createFulfillmentOrder(
    @Body() body: {
      shippingName: string;
      shippingAddress: string;
      shippingCity: string;
      shippingState: string;
      shippingZipCode: string;
      notifyEmails?: string;
      requireSignature?: boolean;
      shipGatewayOnly?: boolean;
      clientNotes?: string;
      deviceTypes?: string[];
      patientId?: string;
    },
  ) {
    return this.tenoviService.createFulfillmentRequest({
      shippingName: body.shippingName,
      shippingAddress: body.shippingAddress,
      shippingCity: body.shippingCity,
      shippingState: body.shippingState,
      shippingZipCode: body.shippingZipCode,
      notifyEmails: body.notifyEmails,
      requireSignature: body.requireSignature,
      shipGatewayOnly: body.shipGatewayOnly,
      clientNotes: body.clientNotes,
    });
  }

  // Webhooks management
  @Get('webhooks')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async listWebhooks() {
    return this.tenoviService.listWebhooks();
  }

  @Post('webhooks')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async createWebhook(
    @Body() body: { endpoint: string; event: 'MEASUREMENT' | 'FULFILLMENT' | 'SPECIAL_ORDER' },
  ) {
    return this.tenoviService.createWebhook(body.endpoint, body.event);
  }

  // Device Measurements
  @Get('devices/:hwiDeviceId/measurements')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async getDeviceMeasurements(
    @Param('hwiDeviceId') hwiDeviceId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.tenoviService.getDeviceMeasurements(hwiDeviceId, {
      page,
      limit,
      startDate,
      endDate,
    });
  }

  @Get('patients/:externalId/measurements')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async getPatientMeasurements(
    @Param('externalId') externalId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.tenoviService.getPatientMeasurements(externalId, {
      page,
      limit,
      startDate,
      endDate,
    });
  }

  // HWI Patients
  @Get('hwi-patients')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async listHwiPatients(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.tenoviService.listHwiPatients(page, limit);
  }

  @Get('hwi-patients/:externalId')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async getHwiPatient(@Param('externalId') externalId: string) {
    return this.tenoviService.getHwiPatient(externalId);
  }

  @Post('hwi-patients')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async createHwiPatient(@Body() body: any) {
    return this.tenoviService.createHwiPatient(body);
  }

  @Patch('hwi-patients/:externalId')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async updateHwiPatient(
    @Param('externalId') externalId: string,
    @Body() body: any,
  ) {
    return this.tenoviService.updateHwiPatient(externalId, body);
  }

  @Delete('hwi-patients/:externalId')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async deleteHwiPatient(@Param('externalId') externalId: string) {
    return this.tenoviService.deleteHwiPatient(externalId);
  }

  // Unassign Device
  @Post('devices/:hwiDeviceId/unassign')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async unassignDevice(@Param('hwiDeviceId') hwiDeviceId: string) {
    return this.tenoviService.unassignHwiDeviceFromPatient(hwiDeviceId);
  }

  // List All Gateways
  @Get('gateways')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async listAllGateways(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.tenoviService.listAllGateways(page, limit);
  }

  @Get('gateways/local')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async listLocalGateways(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.tenoviService.findAllLocalGateways({ page, limit, organizationId });
  }

  @Post('gateways/:gatewayId/unlink')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async unlinkGateway(@Param('gatewayId') gatewayId: string) {
    return this.tenoviService.unlinkGateway(gatewayId);
  }

  // Device Properties
  @Get('devices/:hwiDeviceId/properties')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async getDeviceProperties(@Param('hwiDeviceId') hwiDeviceId: string) {
    return this.tenoviService.getDeviceProperties(hwiDeviceId);
  }

  @Get('devices/:hwiDeviceId/properties/:propertyId')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async getDeviceProperty(
    @Param('hwiDeviceId') hwiDeviceId: string,
    @Param('propertyId') propertyId: string,
  ) {
    return this.tenoviService.getDeviceProperty(hwiDeviceId, propertyId);
  }

  @Patch('devices/:hwiDeviceId/properties/:propertyId')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async updateDeviceProperty(
    @Param('hwiDeviceId') hwiDeviceId: string,
    @Param('propertyId') propertyId: string,
    @Body() body: { value: string },
  ) {
    return this.tenoviService.updateDeviceProperty(hwiDeviceId, propertyId, body.value);
  }

  // Bulk Orders
  @Get('bulk-orders')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async listBulkOrders(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.tenoviService.listBulkOrders(page, limit);
  }

  @Get('bulk-orders/:orderId')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getBulkOrder(@Param('orderId') orderId: string) {
    return this.tenoviService.getBulkOrder(orderId);
  }

  @Post('bulk-orders')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async createBulkOrder(@Body() body: {
    shippingName: string;
    shippingAddress: string;
    shippingCity: string;
    shippingState: string;
    shippingZipCode: string;
    notifyEmails?: string;
    contents: Array<{ name: string; quantity: number }>;
  }) {
    return this.tenoviService.createBulkOrder(body);
  }

  // Device Replacements
  @Get('replacements')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async listReplacements(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.tenoviService.listReplacements(page, limit);
  }

  @Get('replacements/:replacementId')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getReplacement(@Param('replacementId') replacementId: string) {
    return this.tenoviService.getReplacement(replacementId);
  }

  @Post('replacements')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async createReplacement(@Body() body: {
    hwiDeviceId: string;
    newHardwareUuid: string;
    reason?: string;
  }) {
    return this.tenoviService.createReplacement(body);
  }

  // Webhook Resend/Test
  @Post('webhooks/resend')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async resendWebhooks(@Body() body: {
    webhookIds?: string[];
    startDate?: string;
    endDate?: string;
    hwiDeviceId?: string;
  }) {
    return this.tenoviService.resendWebhooks(body);
  }

  @Post('webhooks/test')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async testWebhooks(@Body() body: {
    webhookIds: string[];
    event: 'MEASUREMENT' | 'FULFILLMENT' | 'SPECIAL_ORDER';
  }) {
    return this.tenoviService.testWebhooks(body);
  }

  // Hardware UUID Logs
  @Get('hardware-logs')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getHardwareUuidLogs(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('hwiDeviceId') hwiDeviceId?: string,
  ) {
    return this.tenoviService.getHardwareUuidLogs({ page, limit, hwiDeviceId });
  }

  // Local Device Operations
  @Get('devices/local')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async listLocalDevices(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('sensorCode') sensorCode?: string,
    @Query('organizationId') organizationId?: string,
    @Query('patientId') patientId?: string,
    @Query('unassignedOnly') unassignedOnly?: string,
  ) {
    return this.tenoviService.findAllLocalDevices({
      page,
      limit,
      status: status as any,
      sensorCode,
      organizationId,
      patientId,
      unassignedOnly: unassignedOnly === 'true',
    });
  }
}

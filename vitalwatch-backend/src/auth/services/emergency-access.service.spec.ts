import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { EmergencyAccessService } from './emergency-access.service';
import { AuditService } from '../../audit/audit.service';

describe('EmergencyAccessService', () => {
  let service: EmergencyAccessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmergencyAccessService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => (key === 'emergencyAccess.enabled' ? true : undefined)),
          },
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();
    service = module.get<EmergencyAccessService>(EmergencyAccessService);
  });

  describe('requestAccess', () => {
    it('should grant emergency access', async () => {
      const grant = await service.requestAccess('user-1', 'patient-1', 'Emergency', '127.0.0.1');
      expect(grant.accessId).toBeDefined();
      expect(grant.userId).toBe('user-1');
      expect(grant.patientId).toBe('patient-1');
      expect(grant.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('validate', () => {
    it('should validate active grant', async () => {
      const grant = await service.requestAccess('user-1', 'patient-1', 'Test', '127.0.0.1');
      expect(service.validate(grant.accessId, 'user-1')).toBe(true);
    });

    it('should reject invalid accessId', () => {
      expect(service.validate('invalid-id', 'user-1')).toBe(false);
    });

    it('should reject wrong user', async () => {
      const grant = await service.requestAccess('user-1', 'patient-1', 'Test', '127.0.0.1');
      expect(service.validate(grant.accessId, 'user-2')).toBe(false);
    });
  });

  describe('revoke', () => {
    it('should revoke access', async () => {
      const grant = await service.requestAccess('user-1', 'patient-1', 'Test', '127.0.0.1');
      await service.revoke(grant.accessId, 'user-1');
      expect(service.validate(grant.accessId, 'user-1')).toBe(false);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { setupTestDatabase, cleanupTestDatabase } from '../database-helpers';

describe('Communication Integration (e2e)', () => {
  let app: INestApplication;
  let patientToken: string;
  let providerToken: string;
  let patientId: string;
  let providerId: string;
  let conversationId: string;

  beforeAll(async () => {
    await setupTestDatabase();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await app.close();
  });

  it('should create secure messaging conversation', async () => {
    const response = await request(app.getHttpServer())
      .post('/messaging/conversations')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        providerId,
        subject: 'Test conversation',
        initialMessage: 'Hello doctor',
      })
      .expect(201);

    conversationId = response.body.id;
    expect(response.body.encryptionKeyId).toBeDefined();
  });

  it('should send encrypted message', async () => {
    const response = await request(app.getHttpServer())
      .post(`/messaging/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        content: 'My blood pressure has been high',
        type: 'TEXT',
      })
      .expect(201);

    expect(response.body.status).toBe('SENT');
    expect(response.body.encryptedContent).toBeDefined();
  });

  it('should retrieve and decrypt messages', async () => {
    const response = await request(app.getHttpServer())
      .get(`/messaging/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(response.body.decryptedMessages).toBeDefined();
    expect(response.body.decryptedMessages[0].content).toBeDefined();
  });

  it('should handle file attachments securely', async () => {
    const response = await request(app.getHttpServer())
      .post(`/messaging/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        content: 'Here are my test results',
        type: 'FILE',
        attachments: [
          {
            fileName: 'blood-test.pdf',
            fileSize: 1024000,
            mimeType: 'application/pdf',
            url: 'https://secure-storage.example.com/file-123',
          },
        ],
      })
      .expect(201);

    expect(response.body.attachments).toBeDefined();
    expect(response.body.attachments[0].scannedForVirus).toBeDefined();
  });

  it('should mark messages as read', async () => {
    const messagesResponse = await request(app.getHttpServer())
      .get(`/messaging/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    const messageIds = messagesResponse.body.messages.map((m) => m.id);

    await request(app.getHttpServer())
      .post(`/messaging/conversations/${conversationId}/mark-read`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ messageIds })
      .expect(200);

    const unreadResponse = await request(app.getHttpServer())
      .get('/messaging/unread-count')
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    expect(unreadResponse.body.count).toBe(0);
  });

  it('should create WebRTC video call session', async () => {
    const response = await request(app.getHttpServer())
      .post('/webrtc/rooms')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        patientId,
        appointmentId: 'appt-123',
      })
      .expect(201);

    expect(response.body.roomId).toBeDefined();
    expect(response.body.status).toBe('created');
  });

  it('should exchange WebRTC signaling data', async () => {
    const roomResponse = await request(app.getHttpServer())
      .post('/webrtc/rooms')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ patientId });

    const roomId = roomResponse.body.roomId;

    const response = await request(app.getHttpServer())
      .post(`/webrtc/rooms/${roomId}/signal`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        type: 'offer',
        sdp: 'v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\n',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('should handle typing indicators', async () => {
    await request(app.getHttpServer())
      .post(`/messaging/conversations/${conversationId}/typing`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ isTyping: true })
      .expect(200);
  });
});

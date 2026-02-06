import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { setupTestDatabase, cleanupTestDatabase } from '../database-helpers';
import * as io from 'socket.io-client';

describe('WebSocket Load Testing', () => {
  let app: INestApplication;
  const sockets: any[] = [];

  beforeAll(async () => {
    await setupTestDatabase();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    sockets.forEach((socket) => socket.disconnect());
    await cleanupTestDatabase();
    await app.close();
  });

  it('should handle 50 concurrent WebSocket connections', async () => {
    const connectionPromises = [];

    for (let i = 0; i < 50; i++) {
      const promise = new Promise((resolve) => {
        const socket = io.connect('http://localhost:3000', {
          transports: ['websocket'],
        });

        socket.on('connect', () => {
          sockets.push(socket);
          resolve(socket);
        });
      });

      connectionPromises.push(promise);
    }

    const connectedSockets = await Promise.all(connectionPromises);
    expect(connectedSockets.length).toBe(50);
  }, 10000);

  it('should broadcast messages to all connected clients efficiently', async () => {
    const startTime = Date.now();
    const messagePromises = sockets.map((socket) => {
      return new Promise((resolve) => {
        socket.once('notification', () => resolve(true));
      });
    });

    // Trigger broadcast
    sockets[0].emit('test-broadcast', { message: 'Test' });

    await Promise.all(messagePromises);
    const duration = Date.now() - startTime;

    console.log(`Broadcast to 50 clients: ${duration}ms`);
    expect(duration).toBeLessThan(1000);
  });
});

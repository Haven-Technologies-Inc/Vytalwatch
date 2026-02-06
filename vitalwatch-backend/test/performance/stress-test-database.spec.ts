import { Test, TestingModule } from '@nestjs/testing';
import { getConnection } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { setupTestDatabase, cleanupTestDatabase } from '../database-helpers';

describe('Database Stress Testing', () => {
  let app;

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

  it('should handle bulk insert of 1000 vitals records', async () => {
    const connection = getConnection();
    const startTime = Date.now();

    const vitals = Array.from({ length: 1000 }, (_, i) => ({
      patientId: 'patient-123',
      type: 'BLOOD_PRESSURE',
      systolic: 120 + Math.random() * 20,
      diastolic: 80 + Math.random() * 10,
      timestamp: new Date(Date.now() - i * 3600000),
    }));

    await connection.manager.save('Vital', vitals);
    const duration = Date.now() - startTime;

    console.log(`Bulk insert 1000 records: ${duration}ms`);
    expect(duration).toBeLessThan(5000);
  });

  it('should efficiently query large datasets with indexes', async () => {
    const connection = getConnection();
    const startTime = Date.now();

    await connection.query(`
      SELECT * FROM vitals
      WHERE patient_id = $1
      AND timestamp > NOW() - INTERVAL '30 days'
      ORDER BY timestamp DESC
      LIMIT 100
    `, ['patient-123']);

    const duration = Date.now() - startTime;

    console.log(`Complex query with index: ${duration}ms`);
    expect(duration).toBeLessThan(100);
  });

  it('should handle concurrent transactions', async () => {
    const connection = getConnection();
    const promises = [];

    for (let i = 0; i < 20; i++) {
      promises.push(
        connection.transaction(async (manager) => {
          await manager.query('INSERT INTO vitals (patient_id, type, systolic) VALUES ($1, $2, $3)', [
            'patient-123',
            'BLOOD_PRESSURE',
            120,
          ]);
          await manager.query('SELECT * FROM vitals WHERE patient_id = $1', ['patient-123']);
        }),
      );
    }

    await expect(Promise.all(promises)).resolves.toBeDefined();
  });
});

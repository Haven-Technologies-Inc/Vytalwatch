import { Connection, createConnection, getConnection } from 'typeorm';

let connection: Connection;

/**
 * Setup test database
 */
export async function setupTestDatabase(): Promise<Connection> {
  try {
    connection = await createConnection({
      type: 'postgres',
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      username: process.env.TEST_DB_USERNAME || 'test',
      password: process.env.TEST_DB_PASSWORD || 'test',
      database: process.env.TEST_DB_DATABASE || 'vitalwatch_test',
      entities: ['src/**/*.entity.ts'],
      synchronize: true, // Auto-create schema for tests
      dropSchema: true, // Drop schema before each test run
      logging: false,
    });

    console.log('Test database connected');
    return connection;
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }
}

/**
 * Cleanup test database
 */
export async function cleanupTestDatabase(): Promise<void> {
  try {
    const connection = getConnection();

    if (connection && connection.isConnected) {
      await connection.dropDatabase();
      await connection.close();
      console.log('Test database cleaned up');
    }
  } catch (error) {
    console.error('Failed to cleanup test database:', error);
  }
}

/**
 * Clear all tables but keep schema
 */
export async function clearDatabase(): Promise<void> {
  const connection = getConnection();
  const entities = connection.entityMetadatas;

  for (const entity of entities) {
    const repository = connection.getRepository(entity.name);
    await repository.clear();
  }

  console.log('All tables cleared');
}

/**
 * Seed test database with sample data
 */
export async function seedTestDatabase(): Promise<void> {
  const connection = getConnection();

  // Create test admin user
  await connection.query(`
    INSERT INTO users (id, email, password, role, first_name, last_name, created_at)
    VALUES
      ('admin-test', 'admin@test.com', '$2b$10$test', 'admin', 'Admin', 'User', NOW()),
      ('provider-test', 'provider@test.com', '$2b$10$test', 'provider', 'Dr. Test', 'Provider', NOW()),
      ('patient-test', 'patient@test.com', '$2b$10$test', 'patient', 'Test', 'Patient', NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  console.log('Test database seeded');
}

/**
 * Run migrations for test database
 */
export async function runTestMigrations(): Promise<void> {
  const connection = getConnection();
  await connection.runMigrations();
  console.log('Test migrations completed');
}

/**
 * Revert migrations for test database
 */
export async function revertTestMigrations(): Promise<void> {
  const connection = getConnection();
  await connection.undoLastMigration();
  console.log('Test migrations reverted');
}

/**
 * Execute raw SQL query for testing
 */
export async function executeQuery(sql: string, parameters?: any[]): Promise<any> {
  const connection = getConnection();
  return connection.query(sql, parameters);
}

/**
 * Get entity repository for testing
 */
export function getTestRepository(entityName: string) {
  const connection = getConnection();
  return connection.getRepository(entityName);
}

/**
 * Create test transaction
 */
export async function withTestTransaction(callback: (queryRunner: any) => Promise<void>) {
  const connection = getConnection();
  const queryRunner = connection.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    await callback(queryRunner);
    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Truncate specific tables
 */
export async function truncateTables(tableNames: string[]): Promise<void> {
  const connection = getConnection();

  for (const tableName of tableNames) {
    await connection.query(`TRUNCATE TABLE "${tableName}" CASCADE`);
  }

  console.log(`Truncated tables: ${tableNames.join(', ')}`);
}

/**
 * Check if table exists
 */
export async function tableExists(tableName: string): Promise<boolean> {
  const connection = getConnection();
  const result = await connection.query(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = $1
    )`,
    [tableName],
  );

  return result[0].exists;
}

/**
 * Get table row count
 */
export async function getTableCount(tableName: string): Promise<number> {
  const connection = getConnection();
  const result = await connection.query(`SELECT COUNT(*) FROM "${tableName}"`);
  return parseInt(result[0].count, 10);
}

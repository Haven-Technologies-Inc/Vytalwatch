module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/migrations/**',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  testEnvironment: 'node',
  rootDir: './',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/test/test-setup.ts'],
  testTimeout: 30000,
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/test/**/*.spec.ts'],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/test/integration/',
        '/test/e2e/',
        '/test/performance/',
        '/test/security/',
      ],
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/test-setup.ts'],
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/test/e2e/**/*.spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/test-setup.ts'],
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/test/performance/**/*.spec.ts'],
      testTimeout: 60000,
    },
    {
      displayName: 'security',
      testMatch: ['<rootDir>/test/security/**/*.spec.ts'],
    },
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

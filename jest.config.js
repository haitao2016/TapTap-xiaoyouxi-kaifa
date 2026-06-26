/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@tapdev/types$': '<rootDir>/packages/types/src/index.ts',
    '^@tapdev/core$': '<rootDir>/packages/core/src/index.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
  },
  extensionsToTreatAsEsm: ['.ts'],
  collectCoverageFrom: [
    'packages/core/src/**/*.ts',
    '!packages/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      statements: 30,
      branches: 20,
      functions: 30,
      lines: 30,
    },
  },
  verbose: true,
  injectGlobals: true,
};

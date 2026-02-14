module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {}]
  },
  moduleNameMapper: {
    '^chalk$': '<rootDir>/__mocks__/chalk.js',
    '^ora$': '<rootDir>/__mocks__/ora.js',
    '^cli-table3$': '<rootDir>/__mocks__/cli-table3.js'
  }
};
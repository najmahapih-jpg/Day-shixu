module.exports = {
  roots: ['<rootDir>/cloudfunctions', '<rootDir>/stores', '<rootDir>/components'],
  testMatch: ['**/__tests__/**/*.test.js'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  transform: {
    '^.+\\.vue$': '<rootDir>/scripts/jest-vue-transform.cjs',
    '^.+\\.ts$': '<rootDir>/scripts/jest-ts-transform.cjs',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^wx-server-sdk$': '<rootDir>/cloudfunctions/__mocks__/wx-server-sdk.js',
  },
}

module.exports = {
  roots: ['<rootDir>/cloudfunctions', '<rootDir>/stores'],
  testMatch: ['**/__tests__/**/*.test.js'],
  transform: {},
  moduleNameMapper: {
    '^wx-server-sdk$': '<rootDir>/cloudfunctions/__mocks__/wx-server-sdk.js',
  },
}

module.exports = {
  roots: ['<rootDir>/cloudfunctions'],
  testMatch: ['**/__tests__/**/*.test.js'],
  transform: {},
  moduleNameMapper: {
    '^wx-server-sdk$': '<rootDir>/cloudfunctions/__mocks__/wx-server-sdk.js',
  },
}

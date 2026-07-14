export default {
  testEnvironment: 'node',
  transform: {},
  setupFilesAfterEnv: ['./tests/setup.js'],
  collectCoverageFrom: ['services/**/*.js', 'routes/**/*.js'],
  coverageDirectory: 'coverage'
};

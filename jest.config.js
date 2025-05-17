module.exports = {
  projects: ["<rootDir>/packages/*/jest.config.js"],
  testEnvironment: "node",
  collectCoverage: true,
  coverageDirectory: "<rootDir>/coverage",
  collectCoverageFrom: [
    "packages/*/src/**/*.{ts,tsx}",
    "!**/node_modules/**",
    "!**/dist/**",
  ],
};

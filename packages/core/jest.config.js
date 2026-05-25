module.exports = {
  displayName: "core",
  preset: "ts-jest",
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/src/__tests__/**/*.(test|spec).(ts|tsx)"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        useESM: true,
        babelConfig: true,
      },
    ],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  coverageDirectory: "../../coverage/packages/core",
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.json",
      useESM: true,
    },
  },
};

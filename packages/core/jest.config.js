module.exports = {
  displayName: "core",
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.(ts|tsx)"],
  // Svelte 바인딩은 vitest (vitest.config.mjs)
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/src/svelte/"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  coverageDirectory: "../../coverage/packages/core",
};

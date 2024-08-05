export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  testPathIgnorePatterns: ["./dist", "./test/deno/", "./qb"],
  globalSetup: "./test/globalSetup.ts",
  globalTeardown: "./test/globalTeardown.ts",
  extensionsToTreatAsEsm: [".ts"],
  moduleFileExtensions: ["ts", "js"],
  transform: {
    "\\.[jt]sx?$": [
      "ts-jest",
      {
        useESM: true,
        tsConfig: "./tsconfig.test.json",
      },
    ],
  },

  transformIgnorePatterns: ["./node_modules/"],
  transform: {
    "\\.[jt]sx?$": "ts-jest",
  },
  moduleNameMapper: {
    // "^(\\.{1,2}/.*)\\.[jt]s$": "$1",
    "^(.*)\\.js$": "$1.ts",
  },
  resolver: "ts-jest-resolver",
};

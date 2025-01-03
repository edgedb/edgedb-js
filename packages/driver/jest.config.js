module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["./dist", "./test/deno/", "./qb"],
  // transform: {
  //   "^.+\\.mts$": ["ts-jest", { useESM: true }],
  //   "^.+\\.ts$": "ts-jest",
  // },
  // extensionsToTreatAsEsm: [".mts"],
  // testMatch: ["**/*.test.{ts,mts}"],
  // extensionsToTreatAsEsm: [".ts"],
  // transform: {
  //   "^.+\\.ts$": [
  //     "ts-jest",
  //     {
  //       useESM: true,
  //     },
  //   ],
  // },
  // preset: "ts-jest",
  // testEnvironment: "node",
  // testPathIgnorePatterns: ["./dist", "./test/deno/", "./qb"],
  // globalSetup: "./test/globalSetup.ts",
  // globalTeardown: "./test/globalTeardown.ts",
};

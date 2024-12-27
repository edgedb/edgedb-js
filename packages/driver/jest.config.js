module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // preset: "ts-jest",
  // testEnvironment: "node",
  testPathIgnorePatterns: ["./dist", "./test/deno/", "./qb"],
  // transform: {
  //   "ts-jest": {
  //     tsconfig: "./tsconfig.esm.json",
  //   },
  // },
  // testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(ts|mts)$", // Include .mts files
  // moduleFileExtensions: ["ts", "mts", "js", "json", "node"],
  globalSetup: "./test/globalSetup.ts",
  globalTeardown: "./test/globalTeardown.ts",
};

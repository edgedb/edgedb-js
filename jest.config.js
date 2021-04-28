module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["./dist", "./test/deno/"],
  globalSetup: "./test/globalSetup.ts",
  globalTeardown: "./test/globalTeardown.ts",
};

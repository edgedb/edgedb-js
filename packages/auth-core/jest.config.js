module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["./dist"],
  globalSetup: "./test/globalSetup.ts",
  globalTeardown: "./test/globalTeardown.ts",
};

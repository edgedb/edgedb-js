module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["./dist", "./esm", "./mts", "./cjs", "./deno"],
  globalSetup: "./test/globalSetup.ts",
  transform: {},
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.json"
    }
  }
};

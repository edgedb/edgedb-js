module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: [
    "./dist",
    "./esm",
    "./mts",
    "./cjs",
    "./deno",
    "./queries"
  ],
  transform: {},
  globals: {
    "ts-jest": {
      tsConfig: "tsconfig.json"
    }
  }
};

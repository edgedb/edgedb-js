module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["./dist", "./esm", "./mts", "./cjs", "./deno"],
  transform: {},
  globals: {
    "ts-jest": {
      tsConfig: "tsconfig.json",
    },
  },
};

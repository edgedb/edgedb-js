module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["./dist", "./esm", "./mts"],
  transform: {},
  globals: {
    "ts-jest": {
      tsConfig: "tsconfig.json",
    },
  },
};

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["./dist"],
  transform: {},
  globals: {
    "ts-jest": {
      tsConfig: "tsconfig.json",
    },
  },
};

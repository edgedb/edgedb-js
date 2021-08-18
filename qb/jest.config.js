module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["./dist"],
  globals: {
    "ts-jest": {
      tsConfig: "tsconfig.json",
    },
  },
};

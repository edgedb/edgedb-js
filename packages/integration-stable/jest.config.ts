import { type Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["./dist", "./esm", "./mts", "./cjs", "./deno"],
  globalSetup: "./globalSetup.ts",
  transform: {},
  globals: {},
};

export default config;

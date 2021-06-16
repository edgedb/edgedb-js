import path from "path";
import {
  generateCasts,
  generateQB,
  generateScalars,
} from "../src/reflection/generate";

const CXN = {
  database: "edgedb",
  port: 10732,
  user: "edgedb",
  host: "localhost",
  password: "PwMeDq01U7UGq5JaT3NfMEuH",
};

const run = async () => {
  // await generateQB(path.join(__dirname, "example"));
  await generateCasts(CXN);
  // await generateScalars(CXN);
  process.exit();
};
run();

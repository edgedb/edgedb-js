import path from "path";
import {generateQB} from "../src/reflection/generate";

const CXN = {
  database: "edgedb",
  port: 10732,
  user: "edgedb",
  host: "localhost",
  password: "PwMeDq01U7UGq5JaT3NfMEuH",
};

const run = async () => {
  const TO = path.join(__dirname, "example");
  await generateQB(TO);
  process.exit();
};
run();

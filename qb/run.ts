import path from "path";
import {generateCasts, generateQB} from "../src/reflection/generate";

const CXN = {
  database: "edgedb",
  port: 10732,
  user: "edgedb",
  host: "localhost",
  password: "PwMeDq01U7UGq5JaT3NfMEuH",
};

generateQB(path.join(__dirname, "example"));
// generateCasts(CXN);

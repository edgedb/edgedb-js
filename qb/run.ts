import path from "path";
import {generateQB} from "../src/reflection/generate";

generateQB(path.join(__dirname, "example"), {
  database: "edgedb",
  port: 10732,
  user: "edgedb",
  host: "localhost",
  password: "PwMeDq01U7UGq5JaT3NfMEuH",
});

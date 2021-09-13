import path from "path";
import {generateQB} from "./src/reflection/generate";

const run = async () => {
  const TO = path.join(__dirname, "generated/example");
  await generateQB(TO, {dsn: "qb"});
  process.exit();
};
run();

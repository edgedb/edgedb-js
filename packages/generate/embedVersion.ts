import path from "path";
import { fileURLToPath } from "url";
import { readFileSync, writeFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageVersion = JSON.parse(
  readFileSync(path.join(__dirname, "package.json"), "utf8"),
).version;

for (const filepath of process.argv.slice(2)) {
  writeFileSync(
    filepath,
    readFileSync(filepath, "utf8").replace(
      "__@edgedb/generate__VERSION_PLACEHOLDER__",
      packageVersion,
    ),
  );
}

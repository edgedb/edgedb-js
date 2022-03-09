import path from "path";
import {fileURLToPath} from "url";
import fs from "fs";
import {execSync} from "child_process";
import {createClient} from "edgedb";

const __dirname = fileURLToPath(import.meta.url);
const QBDIR = path.resolve(__dirname, "../../dbschema/qbout");

const client = createClient();

const CMD = [
  `yarn generate`,
  `--output-dir ./dbschema/qbout`,
  `--force-overwrite`,
  "--target esm",
];

async function run() {
  try {
    if (parseInt(process.version.slice(1)) < 14) {
      console.log(`Node.js version is <14. Skipping ESM test.`);
      return;
    }
    execSync(CMD.join(" "));
    const indexFilePath = path.resolve(QBDIR, "index.mjs");
    const {default: e} = await import(indexFilePath);
    const result = await e.str("Hello world!").run(client);
    if (result !== "Hello world!") throw new Error();
    // fs.rmdirSync(QBDIR, {recursive: true});
    console.log(`ESM tests successful.`);
  } catch (err) {
    console.log(err);
    // fs.rmdirSync(QBDIR, {recursive: true});
    process.exit(1);
  }
}

run();

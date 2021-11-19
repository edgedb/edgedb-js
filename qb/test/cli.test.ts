import path from "path";
import {exists, fs, readFileUtf8} from "../../src/adapter.node";
import util from "util";
import {exec as execCB, execSync} from "child_process";
import {ConnectConfig} from "edgedb/dist/con_utils";
const exec = util.promisify(execCB);

const QBDIR = path.resolve(__dirname, "../dbschema/qbout");

test("basic generate", async () => {
  const opts = process.env.EDGEDB_TEST_USE_LOCAL
    ? undefined
    : <ConnectConfig>JSON.parse(process.env._JEST_EDGEDB_CONNECT_CONFIG || "");

  if (!process.env.EDGEDB_TEST_USE_LOCAL && !opts) {
    throw new Error("No connection options found.");
  }

  const CMD = opts
    ? [
        `yarn generate`,
        `--host ${opts.host}`,
        `--port ${opts.port}`,
        `--user ${opts.user}`,
        `--database ${opts.database}`,
        `--tls-security ${opts.tlsSecurity}`,
        `--tls-ca-file ${opts.tlsCAFile}`,
        `--force-overwrite`,
        `--output-dir ./dbschema/qbout`,
      ]
    : [`yarn generate`, `--output-dir ./dbschema/qbout`, `--force-overwrite`];

  // test TypeScript generation
  console.log(`Generating TS...`);
  const tsResult = execSync(CMD.join(" "));
  expect(await exists(path.resolve(QBDIR, "index.ts"))).toEqual(true);

  // test JS + ESM
  console.log(`Generating ESM...`);
  const esmResult = execSync([...CMD, "--target esm"].join(" "));
  expect(await exists(path.resolve(QBDIR, "index.mjs"))).toEqual(true);
  expect(await exists(path.resolve(QBDIR, "index.d.ts"))).toEqual(true);
  const esmFile = await readFileUtf8(path.resolve(QBDIR, "index.mjs"));
  expect(esmFile.includes("import")).toEqual(true);
  expect(esmFile.includes("std.mjs")).toEqual(true);
  expect(esmFile.includes("export")).toEqual(true);

  // test JS + ESM
  console.log(`Generating CJS...`);
  const cjsResult = execSync([...CMD, "--target cjs"].join(" "));
  expect(await exists(path.resolve(QBDIR, "index.js"))).toEqual(true);
  expect(await exists(path.resolve(QBDIR, "index.d.ts"))).toEqual(true);
  const cjsFile = await readFileUtf8(path.resolve(QBDIR, "index.js"));
  expect(cjsFile.includes("require")).toEqual(true);
  expect(cjsFile.includes(`require("./modules/std")`)).toEqual(true);

  console.log(`Done. Removing ${QBDIR}...`);
  // re-generate TS
  // expected for other tests
  return await fs.rmdir(QBDIR, {recursive: true});
}, 60000);

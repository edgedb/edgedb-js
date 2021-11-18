import path from "path";
import {exists, fs, readFileUtf8} from "../../src/adapter.node";
import util from "util";
import {exec as execCB, execSync} from "child_process";
const exec = util.promisify(execCB);

const QBDIR = path.resolve(__dirname, "../dbschema/qbout");

test("basic generate", async () => {
  const opts = process.env._JEST_EDGEDB_CONNECT_CONFIG
    ? JSON.parse(process.env._JEST_EDGEDB_CONNECT_CONFIG!)
    : undefined;

  const CMD = opts
    ? [
        `yarn generate`,
        `--dsn edgedb://localhost:${opts.port}`,
        `--tls-security insecure`,
        `--force-overwrite`,
        `--output-dir ./dbschema/qbout`,
      ]
    : [`yarn generate`, `--output-dir ./dbschema/qbout`, `--force-overwrite`];

  // test TypeScript generation
  console.log(`Generating TS...`);
  // await generateQB({outputDir: QBDIR, target:"ts", connectionConfig: opts});
  console.time("qb_gen");
  const tsResult = execSync(CMD.join(" "));
  // console.log(tsResult.stderr);
  // console.log(tsResult.stdout);
  console.timeEnd("qb_gen");
  expect(await exists(path.resolve(QBDIR, "index.ts"))).toEqual(true);

  // test JS + ESM
  console.log(`Generating ESM...`);
  console.time("qb_gen");
  const esmResult = execSync([...CMD, "--target esm"].join(" "));
  // console.log(esmResult.stderr);
  // console.log(esmResult.stdout);
  console.timeEnd("qb_gen");
  expect(await exists(path.resolve(QBDIR, "index.mjs"))).toEqual(true);
  expect(await exists(path.resolve(QBDIR, "index.d.ts"))).toEqual(true);
  const esmFile = await readFileUtf8(path.resolve(QBDIR, "index.mjs"));
  expect(esmFile.includes("import")).toEqual(true);
  expect(esmFile.includes("std.mjs")).toEqual(true);
  expect(esmFile.includes("export")).toEqual(true);

  // test JS + ESM
  console.log(`Generating CJS...`);
  console.time("qb_gen");
  const cjsResult = execSync([...CMD, "--target cjs"].join(" "));
  // console.log(cjsResult.stderr);
  // console.log(cjsResult.stdout);
  console.timeEnd("qb_gen");
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

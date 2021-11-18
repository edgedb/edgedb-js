import child_process from "child_process";
import path from "path";
import {exists, fs, readFileUtf8} from "../../src/adapter.node";

const QBDIR = path.resolve(__dirname, "../dbschema/qbout");

test("basic generate", async () => {
  jest.setTimeout(10000);
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
  child_process.execSync(CMD.join(" "));
  expect(await exists(path.resolve(QBDIR, "index.ts"))).toEqual(true);

  // test JS + ESM
  console.log(`Generating ESM...`);
  child_process.execSync([...CMD, "--target esm"].join(" "));
  expect(await exists(path.resolve(QBDIR, "index.mjs"))).toEqual(true);
  expect(await exists(path.resolve(QBDIR, "index.d.ts"))).toEqual(true);
  const esmFile = await readFileUtf8(path.resolve(QBDIR, "index.mjs"));
  expect(esmFile.includes("import")).toEqual(true);
  expect(esmFile.includes("std.mjs")).toEqual(true);
  expect(esmFile.includes("export")).toEqual(true);

  // test JS + ESM
  console.log(`Generating CJS...`);
  child_process.execSync([...CMD, "--target cjs"].join(" "));
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

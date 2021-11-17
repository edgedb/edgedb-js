import {Client, $} from "edgedb";
import child_process from "child_process";
import {fs, exists, readFileUtf8} from "../../src/adapter.node";
import path from "path";
import * as tc from "conditional-type-checks";
import {createClient} from "../../src/pool";

const QBDIR = path.resolve(__dirname, "../dbschema/edgeql");

test("basic generate", async () => {
  const opts = process.env._JEST_EDGEDB_CONNECT_CONFIG
    ? JSON.parse(process.env._JEST_EDGEDB_CONNECT_CONFIG!)
    : undefined;

  if (1 > 0) return;
  const CMD = opts
    ? [
        `yarn generate`,
        `--dsn edgedb://localhost:${opts.port}`,
        `--tls-security insecure`,
        `--force-overwrite`,
      ]
    : [`yarn generate`, `--force-overwrite`];

  // test TypeScript generation
  console.log(`Generating TS...`);
  await child_process.execSync(CMD.join(" "));
  expect(await exists(path.resolve(QBDIR, "index.ts"))).toEqual(true);

  // test JS + ESM
  console.log(`Generating ESM...`);
  await child_process.execSync([...CMD, "--target esm"].join(" "));
  expect(await exists(path.resolve(QBDIR, "index.mjs"))).toEqual(true);
  expect(await exists(path.resolve(QBDIR, "index.d.ts"))).toEqual(true);
  const esmFile = await readFileUtf8(path.resolve(QBDIR, "index.mjs"));
  expect(esmFile.includes("import")).toEqual(true);
  expect(esmFile.includes("std.mjs")).toEqual(true);
  expect(esmFile.includes("export")).toEqual(true);

  // test JS + ESM
  console.log(`Generating CJS...`);
  await child_process.execSync([...CMD, "--target cjs"].join(" "));
  expect(await exists(path.resolve(QBDIR, "index.js"))).toEqual(true);
  expect(await exists(path.resolve(QBDIR, "index.d.ts"))).toEqual(true);
  const cjsFile = await readFileUtf8(path.resolve(QBDIR, "index.js"));
  expect(cjsFile.includes("require")).toEqual(true);
  expect(cjsFile.includes(`require("./modules/std")`)).toEqual(true);

  // re-generate TS
  // expected for other tests
  await child_process.execSync(CMD.join(" "));
});

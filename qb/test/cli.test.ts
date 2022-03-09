import path from "path";
import {exists, fs, readFileUtf8} from "../../src/adapter.node";
import {execSync} from "child_process";
import {createClient} from "edgedb";

const QBDIR = path.resolve(__dirname, "../dbschema/qbout");

const CMD = [
  `yarn generate`,
  `--output-dir ./dbschema/qbout`,
  `--force-overwrite`,
];

const client = createClient();

test("basic generate", async () => {
  // test TypeScript generation
  // console.log(`Generating TS...`);
  execSync(CMD.join(" "));
  expect(await exists(path.resolve(QBDIR, "index.ts"))).toEqual(true);

  // test JS + ESM
  // console.log(`Generating ESM...`);
  execSync([...CMD, "--target esm"].join(" "));
  expect(await exists(path.resolve(QBDIR, "index.mjs"))).toEqual(true);
  expect(await exists(path.resolve(QBDIR, "index.d.ts"))).toEqual(true);
  const esmIndex = path.resolve(QBDIR, "index.mjs");
  const esmFile = await readFileUtf8(esmIndex);
  expect(esmFile.includes("import")).toEqual(true);
  expect(esmFile.includes("std.mjs")).toEqual(true);
  expect(esmFile.includes("export")).toEqual(true);
  // test generated code
  execSync(`node --experimental-modules test/esm.test.mjs`);

  // test JS + CJS
  // console.log(`Generating CJS...`);
  execSync([...CMD, "--target cjs"].join(" "));
  const cjsIndex = path.resolve(QBDIR, "index.js");
  expect(await exists(cjsIndex)).toEqual(true);
  expect(await exists(path.resolve(QBDIR, "index.d.ts"))).toEqual(true);
  const cjsFile = await readFileUtf8(path.resolve(QBDIR, "index.js"));
  expect(cjsFile.includes("require")).toEqual(true);
  expect(cjsFile.includes(`require("./modules/std")`)).toEqual(true);

  // test generated code
  const e = require(cjsIndex).default;
  const result = await e.str("Hello world!").run(client);
  expect(result).toEqual("Hello world!");

  // console.log(`Done. Removing ${QBDIR}...`);
  return await fs.rmdir(QBDIR, {recursive: true});
}, 60000);

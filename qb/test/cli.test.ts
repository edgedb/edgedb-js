import path from "path";
import {exists} from "../../src/adapter.node";
import {execSync} from "child_process";

const QBDIR = path.resolve(__dirname, "..");
const GEN_CMD = () => [
  `yarn generate`,
  // `--output-dir ${path}`,
  `--force-overwrite`,
];

test("basic generate", async () => {
  execSync(GEN_CMD().join(" "), {stdio: "inherit"});
  const qbIndex = path.resolve(QBDIR, "dbschema", "edgeql-js", "index.ts");
  expect(await exists(qbIndex)).toEqual(true);

  // test all targets
  execSync(`yarn test:esm`, {stdio: "inherit"});
  execSync(`yarn test:cjs`, {stdio: "inherit"});
  execSync(`yarn test:mts`, {stdio: "inherit"});
  execSync(`yarn test:deno`, {stdio: "inherit"});
}, 60000);

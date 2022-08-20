import path from "path";
import {exists} from "../../src/adapter.node";
import {execSync} from "child_process";

const QBDIR = path.resolve(__dirname, "..");

test("basic generate", async () => {
  execSync(`yarn generate --force-overwrite`, {stdio: "inherit"});
  const qbIndex = path.resolve(QBDIR, "dbschema", "edgeql-js", "index.ts");
  expect(await exists(qbIndex)).toEqual(true);

  // test all targets
  execSync(`yarn test:esm`, {stdio: "inherit"});
  execSync(`yarn test:cjs`, {stdio: "inherit"});
  execSync(`yarn test:mts`, {stdio: "inherit"});
  execSync(`yarn test:deno`, {stdio: "inherit"});
}, 60000);

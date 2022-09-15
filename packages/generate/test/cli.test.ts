import path from "path";
import {adapter} from "edgedb";
import {execSync} from "child_process";

const QBDIR = path.resolve(__dirname, "..");

test("basic generate", async () => {
  execSync(`yarn @edgedb/generate edgeql-js --force-overwrite`, {
    stdio: "inherit"
  });
  const qbIndex = path.resolve(QBDIR, "dbschema", "edgeql-js", "index.ts");
  expect(await adapter.exists(qbIndex)).toEqual(true);

  // test all targets
  // execSync(`yarn test:esm`, {stdio: "inherit"});
  // execSync(`yarn test:cjs`, {stdio: "inherit"});
  // execSync(`yarn test:mts`, {stdio: "inherit"});
  // execSync(`yarn test:deno`, {stdio: "inherit"});
}, 60000);

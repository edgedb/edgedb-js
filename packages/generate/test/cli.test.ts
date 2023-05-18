import assert from "node:assert/strict";
import path from "path";
import { adapter } from "edgedb";
import { execSync } from "child_process";

const QBDIR = path.resolve(__dirname, "..");

test("basic generate", async () => {
  execSync(`yarn generate edgeql-js --force-overwrite`, {
    stdio: "inherit",
  });
  const qbIndex = path.resolve(QBDIR, "dbschema", "edgeql-js", "index.ts");
  assert.equal(await adapter.exists(qbIndex), true);
}, 60000);

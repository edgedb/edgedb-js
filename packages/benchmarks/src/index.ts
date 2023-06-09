import * as path from "node:path";
import * as assert from "node:assert/strict";
import { Bench } from "tinybench";

import { type TSServer, createServer } from "./server-fixture";

const mockFileName = path.join(__dirname, "..", "project-fixture", "main.ts");
const mockFileContent = `\
import { createClient } from "edgedb";
import e from "./dbschema/edgeql-js";

async fuction main() {
  const client = createClient();
  await e
    .select(e.Person, () => ({
      // Cursor here
    }))
    .run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
  await e.select(e.Person, () => ({})).run(client);
}

main();
`;

async function getCompletion(server: TSServer) {
  return server.requestCommand("completions", {
    file: mockFileName,
    offset: 4,
    line: 8,
  });
}

let activeServer: TSServer;

let bench = new Bench({ time: 5000, iterations: 2000 });

for (const version of ["ts48", "ts49", "ts50", "ts51"]) {
  bench = bench.add(
    version,
    async () => {
      await getCompletion(activeServer);
    },
    {
      beforeAll: async () => {
        activeServer = createServer(
          path.join(
            __dirname,
            "..",
            "..",
            "..",
            "node_modules",
            version,
            "lib",
            "tsserver.js"
          )
        );
        activeServer.send({
          command: "open",
          arguments: {
            file: mockFileName,
            fileContent: mockFileContent,
          },
        });
        const response = await getCompletion(activeServer);
        assert.equal(response.command, "completions");
        assert.ok(response.success);
        assert.ok(response.body.length && response.body.length > 0);
        assert.ok(
          response.body.some(
            (com: Record<string, string>) => com.name === "__type__"
          )
        );
        assert.ok(
          response.body.some(
            (com: Record<string, string>) => com.name === "filter_single"
          )
        );
        assert.ok(
          response.body.some((com: Record<string, string>) => com.name === "id")
        );
        for (const _ of Array.from({ length: 100 })) {
          await getCompletion(activeServer);
        }
      },
      afterAll: async () => {
        await activeServer.close();
      },
    }
  );
}

async function main() {
  console.log("Running benchmarks...");

  await bench.run();
  console.table(
    bench.tasks.map(({ name, result }) =>
      result
        ? {
            name,
            "ops/sec": parseInt(result.hz.toString(), 10).toLocaleString(),
            margin: `\xb1${result.rme.toFixed(2)}%`,
            samples: result.samples.length,
            mean: result.mean * 1000,
            p75: result.p75 * 1000,
            p99: result.p99 * 1000,
          }
        : null
    )
  );
}

main();

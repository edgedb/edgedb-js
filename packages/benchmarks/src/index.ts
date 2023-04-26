import * as path from "node:path";
import { Bench } from "tinybench";

import { type TSServer, createServer } from "./server-fixture";

const mockFileName = path.join(__dirname, "..", "project-fixture", "main.ts");
const mockFileContent = `\
import { edgedb } from "edgedb";
import * as e from "./dbschema/edgeql-js";

async fuction main() {
  await e.select(e.Person, () => ({
    # cursor here
  }))
}

main();
`;

async function getCompletion(server: TSServer) {
  await server.requestCommand("completions", {
    file: mockFileName,
    offset: 4,
    line: 5,
  });
}

let activeServer: TSServer;

let bench = new Bench({ time: 50 });

for (const version of ["ts48", "ts49", "ts50", "ts51"]) {
  bench = bench.add(
    version,
    async () => {
      await getCompletion(activeServer);
    },
    {
      beforeAll: () => {
        activeServer = createServer(
          path.join(
            __dirname,
            "..",
            "..",
            "..",
            "node_modules",
            version,
            "bin",
            "tsserver"
          )
        );
        activeServer.send({
          command: "open",
          arguments: {
            file: mockFileName,
            fileContent: mockFileContent,
          },
        });
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

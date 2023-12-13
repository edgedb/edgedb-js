import * as p from "@clack/prompts";
import process from "node:process";
import debug from "debug";

import * as utils from "./utils.js";
import { recipes } from "./recipes.js";

const logger = debug("@edgedb/create:main");

async function main() {
  const packageManager = utils.getPackageManager();
  logger({ packageManager });

  type Framework = "next" | "remix" | "express" | "node-http" | "none";

  const setup = await p.group(
    {
      projectName: () =>
        p.text({
          message: "What is the name of your project or application?",
        }),
      framework: () =>
        p.select<{ value: Framework; label: string }[], Framework>({
          message: "What web framework should be used?",
          options: [
            { value: "next", label: "Next.js" },
            { value: "remix", label: "Remix" },
            { value: "express", label: "Express" },
            { value: "node-http", label: "Node HTTP Server" },
            { value: "none", label: "None" },
          ],
        }),
      useEdgeDBAuth: () =>
        p.confirm({
          message: "Use the EdgeDB Auth extension?",
          initialValue: true,
        }),
      shouldGitInit: () =>
        p.confirm({
          message: "Initialize a git repository and stage changes?",
          initialValue: true,
        }),
      shouldInstall: () =>
        p.confirm({
          message: `Install dependencies with ${packageManager}?`,
          initialValue: true,
        }),
    },
    {
      onCancel: () => {
        process.exit(1);
      },
    }
  );

  logger(setup);

  for (const recipe of recipes) {
    await recipe(setup);
  }
}

await main();

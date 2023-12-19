import process from "node:process";
import fs from "node:fs/promises";
import path from "node:path";

import debug from "debug";
import * as p from "@clack/prompts";

import { updatePackage } from "write-package";

import * as utils from "../../utils.js";
import type { Framework, BaseRecipe, BaseOptions } from "../types.js";

const logger = debug("@edgedb/create:recipe:base");

const recipe: BaseRecipe = {
  async getOptions() {
    const packageManager = utils.getPackageManager();
    logger({ packageManager });

    const opts = await p.group(
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
      },
      {
        onCancel: () => {
          process.exit(1);
        },
      }
    );

    return {
      ...opts,
      packageManager,
      projectDir: path.resolve(process.cwd(), opts.projectName),
    };
  },
  async apply({ projectDir, projectName }: BaseOptions) {
    logger("Running base recipe");
    try {
      const projectDirStat = await fs.stat(projectDir);
      logger({ projectDirStat });

      if (!projectDirStat.isDirectory()) {
        throw new Error(
          `Target project directory ${projectDir} is not a directory`
        );
      }
      const files = await fs.readdir(projectDir);
      if (files.length > 0) {
        throw new Error(`Target project directory ${projectDir} is not empty`);
      }
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        err.code === "ENOENT"
      ) {
        await fs.mkdir(projectDir, { recursive: true });
        logger(`Created project directory: ${projectDir}`);
      } else {
        throw err;
      }
    }

    const dirname = path.dirname(new URL(import.meta.url).pathname);

    logger("Copying files");
    await fs.copyFile(
      path.resolve(dirname, "./_eslint.config.js"),
      path.resolve(projectDir, "eslint.config.js")
    );
    await fs.copyFile(
      path.resolve(dirname, "./_package.json"),
      path.resolve(projectDir, "package.json")
    );
    await fs.copyFile(
      path.resolve(dirname, "./_tsconfig.json"),
      path.resolve(projectDir, "tsconfig.json")
    );

    logger("Writing package.json");
    await updatePackage(projectDir, { name: projectName });
  },
};

export default recipe;

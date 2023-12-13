import debug from "debug";
import fs from "node:fs/promises";
import path from "node:path";
import { readPackage } from "read-pkg";
import { writePackage } from "write-package";
import type { RecipeOptions } from "../types.js";

const logger = debug("@edgedb/create:recipe:base");

export default async function BaseRecipe({
  projectDir,
  projectName,
}: RecipeOptions) {
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

  const dirname = new URL(import.meta.url).pathname;

  logger("Copying files");
  await fs.copyFile(
    path.resolve(dirname, "_eslint.config.js"),
    path.resolve(projectDir, "eslint.config.js")
  );
  await fs.copyFile(
    path.resolve(dirname, "_package.json"),
    path.resolve(projectDir, "package.json")
  );
  await fs.copyFile(
    path.resolve(dirname, "_tsconfig.json"),
    path.resolve(projectDir, "tsconfig.json")
  );

  const manifest = await readPackage({ cwd: projectDir });
  manifest.name = projectName;

  logger("Writing package.json", manifest);
  await writePackage(projectDir, manifest);
}

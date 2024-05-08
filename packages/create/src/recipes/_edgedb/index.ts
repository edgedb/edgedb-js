import * as p from "@clack/prompts";
import fs from "node:fs/promises";
import path from "node:path";
import debug from "debug";

import type { BaseOptions, Recipe } from "../types.js";
import { copyTemplateFiles, execInPackageManager } from "../../utils.js";

const logger = debug("@edgedb/create:recipe:edgedb");

interface EdgeDBOptions {
  initializeProject: boolean;
}

const recipe: Recipe<EdgeDBOptions> = {
  getOptions() {
    return p.group({
      initializeProject: () =>
        p.confirm({
          message: "Initialize a new EdgeDB project with edgedb project init?",
          initialValue: true,
        }),
    });
  },

  async apply(
    { projectDir, useEdgeDBAuth }: BaseOptions,
    { initializeProject }: EdgeDBOptions
  ) {
    logger("Running edgedb recipe");
    logger("Checking for existing EdgeDB CLI");

    const spinner = p.spinner();

    if (initializeProject) {
      spinner.start("Initializing EdgeDB project");
      try {
        await execInPackageManager("edgedb project init --non-interactive", {
          cwd: projectDir,
        });
        const { stdout, stderr } = await execInPackageManager(
          "edgedb query 'select sys::get_version_as_str()'",
          { cwd: projectDir }
        );
        const serverVersion = JSON.parse(stdout.trim());
        logger(`EdgeDB server version: ${serverVersion}`);
        if (serverVersion === "") {
          const err = new Error(
            "There was a problem initializing the EdgeDB project"
          );
          spinner.stop(err.message);
          logger({ stdout, stderr });

          throw err;
        }
        spinner.stop(`EdgeDB v${serverVersion} project initialized`);
      } catch (error) {
        logger(error);
        throw error;
      } finally {
        spinner.stop();
      }
    } else {
      logger("Skipping edgedb project init");
      logger("Copying basic EdgeDB project files");

      const dirname = path.dirname(new URL(import.meta.url).pathname);
      await copyTemplateFiles(path.resolve(dirname, "./template"), projectDir);
    }

    if (useEdgeDBAuth) {
      logger("Adding auth extension to project");

      spinner.start("Enabling auth extension in EdgeDB schema");
      const filePath = path.resolve(projectDir, "./dbschema/default.esdl");
      const data = await fs.readFile(filePath, "utf8");
      await fs.writeFile(filePath, `using extension auth;\n\n${data}`);
      spinner.stop("Auth extension enabled in EdgeDB schema");

      if (initializeProject) {
        logger("Creating and applying initial migration");
        spinner.start("Creating and applying initial migration");
        try {
          await execInPackageManager("edgedb migration create", {
            cwd: projectDir,
          });
          await execInPackageManager("edgedb migrate", { cwd: projectDir });
          spinner.stop("Initial migration created and applied");
        } catch (error) {
          logger(error);
          throw error;
        } finally {
          spinner.stop();
        }
      }
    }
  },
};

export default recipe;

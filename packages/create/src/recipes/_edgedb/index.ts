import * as p from "@clack/prompts";
import fs from "node:fs/promises";
import path from "node:path";
import debug from "debug";
import util from "node:util";
import childProcess from "node:child_process";

import type { BaseOptions, Recipe } from "../types.js";
import { copyTemplateFiles } from "../../utils.js";

const logger = debug("@edgedb/create:recipe:edgedb");
const exec = util.promisify(childProcess.exec);

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
      let edgedbCliVersion: string | null = null;
      let shouldInstallCli: boolean | symbol = true;
      try {
        const { stdout } = await exec("edgedb --version");
        edgedbCliVersion = stdout.trim();
        logger(edgedbCliVersion);
      } catch (error) {
        logger("No EdgeDB CLI detected");
        shouldInstallCli = await p.confirm({
          message:
            "The EdgeDB CLI is required to initialize a project. Install now?",
          initialValue: true,
        });
      }

      if (edgedbCliVersion === null) {
        if (shouldInstallCli === false) {
          logger("User declined to install EdgeDB CLI");
          throw new Error("EdgeDB CLI is required");
        }

        logger("Installing EdgeDB CLI");

        spinner.start("Installing EdgeDB CLI");
        await exec(
          "curl --proto '=https' --tlsv1.2 -sSf https://sh.edgedb.com | sh -s -- -y"
        );
        spinner.stop("EdgeDB CLI installed");
      }

      try {
        const { stdout } = await exec("edgedb --version");
        edgedbCliVersion = stdout.trim();
        logger(edgedbCliVersion);
      } catch (error) {
        logger("EdgeDB CLI could not be installed.");
        throw new Error("EdgeDB CLI could not be installed.");
      }

      spinner.start("Initializing EdgeDB project");
      await exec("edgedb project init --non-interactive", { cwd: projectDir });
      const { stdout, stderr } = await exec(
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
    } else {
      logger("Skipping edgedb project init");
      logger("Copying basic EdgeDB project files");

      const dirname = path.dirname(new URL(import.meta.url).pathname);
      await copyTemplateFiles(
        path.resolve(dirname, "./template"),
        projectDir,
        new Set()
      );
    }

    if (useEdgeDBAuth) {
      logger("Adding auth extension to project");

      spinner.start("Enabling auth extension in EdgeDB schema");
      const filePath = path.resolve(projectDir, "./dbschema/default.esdl");
      const data = await fs.readFile(filePath, "utf8");
      await fs.writeFile(filePath, `using extension auth;\n\n${data}`);
      spinner.stop("Auth extension enabled in EdgeDB schema");
    }
  },
};

export default recipe;

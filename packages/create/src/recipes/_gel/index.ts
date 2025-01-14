import * as p from "@clack/prompts";
import fs from "node:fs/promises";
import path from "node:path";
import debug from "debug";

import type { BaseOptions, Recipe } from "../types.js";
import { copyTemplateFiles, execInLoginShell } from "../../utils.js";

const logger = debug("@gel/create:recipe:gel");

interface GelOptions {
  initializeProject: boolean;
}

const recipe: Recipe<GelOptions> = {
  getOptions() {
    return p.group({
      initializeProject: () =>
        p.confirm({
          message: "Initialize a new Gel project with gel project init?",
          initialValue: true,
        }),
    });
  },

  async apply(
    { projectDir, useGelAuth }: BaseOptions,
    { initializeProject }: GelOptions,
  ) {
    logger("Running gel recipe");
    logger("Checking for existing Gel CLI");

    const spinner = p.spinner();

    if (initializeProject) {
      let gelCliVersion: string | null = null;
      let shouldInstallCli: boolean | symbol = true;
      try {
        const { stdout } = await execInLoginShell("gel --version");
        gelCliVersion = stdout.trim();
        logger(gelCliVersion);
      } catch (_error) {
        logger("No Gel CLI detected");
        shouldInstallCli = await p.confirm({
          message:
            "The Gel CLI is required to initialize a project. Install now?",
          initialValue: true,
        });
      }

      if (gelCliVersion === null) {
        if (shouldInstallCli === false) {
          logger("User declined to install Gel CLI");
          throw new Error("Gel CLI is required");
        }

        logger("Installing Gel CLI");

        spinner.start("Installing Gel CLI");
        const { stdout, stderr } = await execInLoginShell(
          "curl --proto '=https' --tlsv1.2 -sSf https://sh.gel.com | sh -s -- -y",
        );
        logger({ stdout, stderr });
        spinner.stop("Gel CLI installed");
      }

      try {
        const { stdout } = await execInLoginShell("gel --version");
        gelCliVersion = stdout.trim();
        logger(gelCliVersion);
      } catch (error) {
        logger("Gel CLI could not be installed.");
        logger(error);
        throw new Error("Gel CLI could not be installed.");
      }

      spinner.start("Initializing Gel project");
      try {
        await execInLoginShell("gel project init --non-interactive", {
          cwd: projectDir,
        });
        const { stdout, stderr } = await execInLoginShell(
          "gel query 'select sys::get_version_as_str()'",
          { cwd: projectDir },
        );
        const serverVersion = JSON.parse(stdout.trim());
        logger(`Gel server version: ${serverVersion}`);
        if (serverVersion === "") {
          const err = new Error(
            "There was a problem initializing the Gel project",
          );
          spinner.stop(err.message);
          logger({ stdout, stderr });

          throw err;
        }
        spinner.stop(`Gel v${serverVersion} project initialized`);
      } catch (error) {
        logger(error);
        throw error;
      } finally {
        spinner.stop();
      }
    } else {
      logger("Skipping gel project init");
      logger("Copying basic Gel project files");

      const dirname = path.dirname(new URL(import.meta.url).pathname);
      await copyTemplateFiles(path.resolve(dirname, "./template"), projectDir);
    }

    if (useGelAuth) {
      logger("Adding auth extension to project");

      spinner.start("Enabling auth extension in Gel schema");
      const filePath = path.resolve(projectDir, "./dbschema/default.esdl");
      const data = await fs.readFile(filePath, "utf8");
      await fs.writeFile(filePath, `using extension auth;\n\n${data}`);
      spinner.stop("Auth extension enabled in Gel schema");

      if (initializeProject) {
        logger("Creating and applying initial migration");
        spinner.start("Creating and applying initial migration");
        try {
          await execInLoginShell("gel migration create", {
            cwd: projectDir,
          });
          await execInLoginShell("gel migrate", { cwd: projectDir });
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

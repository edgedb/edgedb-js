import * as p from "@clack/prompts";
import fs from "node:fs/promises";
import path from "node:path";
import debug from "debug";
import util from "node:util";
import childProcess from "node:child_process";

import { BaseOptions, Recipe } from "../types.js";

const logger = debug("@edgedb/create:recipe:edgedb");
const exec = util.promisify(childProcess.exec);

const recipe: Recipe = {
  async apply({ projectDir, useEdgeDBAuth }: BaseOptions) {
    logger("Running edgedb recipe");

    const spinner = p.spinner();

    spinner.start("Initializing EdgeDB project");
    await exec("edgedb project init --non-interactive", { cwd: projectDir });
    const { stdout, stderr } = await exec(
      "edgedb query 'select sys::get_version_as_str()'",
      { cwd: projectDir }
    );
    const serverVersion = JSON.parse(stdout.trim());
    logger(`EdgeDB version: ${serverVersion}`);
    if (serverVersion === "") {
      const err = new Error(
        "There was a problem initializing the EdgeDB project"
      );
      spinner.stop(err.message);
      logger({ stdout, stderr });

      throw err;
    }
    spinner.stop(`EdgeDB v${serverVersion} project initialized`);

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

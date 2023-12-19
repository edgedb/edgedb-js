import debug from "debug";
import * as p from "@clack/prompts";

import * as utils from "../../utils.js";
import { BaseOptions, Recipe } from "../types.js";

const logger = debug("@edgedb/create:recipe:install");

interface InstallOptions {
  shouldGitInit: boolean;
  shouldInstall: boolean;
}

const recipe: Recipe<InstallOptions> = {
  getOptions({ packageManager }: BaseOptions) {
    return p.group({
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
    });
  },
  async apply(baseOptions: BaseOptions, recipeOptions: InstallOptions) {
    logger("Running install recipe");
  },
};

export default recipe;

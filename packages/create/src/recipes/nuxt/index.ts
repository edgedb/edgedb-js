import path from "node:path";
import debug from "debug";
import { updatePackage } from "write-package";

import type { BaseOptions, Recipe } from "../types.js";
import { copyTemplateFiles } from "../../utils.js";

const logger = debug("@edgedb/create:recipe:nuxt");

// interface NuxtOptions {}

const recipe: Recipe = {
  skip(opts: BaseOptions) {
    return opts.framework !== "nuxt";
  },
  async apply(
    { projectDir }: BaseOptions,
  ) {
    logger("Running nuxt recipe");

    const dirname = path.dirname(new URL(import.meta.url).pathname);

    await copyTemplateFiles(
      path.resolve(dirname, 'template'),
      projectDir
    );

    await updatePackage(projectDir, {
      type: 'module',
      scripts: {
        dev: "nuxi dev",
        build: "nuxi build",
        start: "nuxi start",
        generate: "nuxi generate"
      },
      dependencies: {
        "@iconify-json/heroicons": "1.1.19",
        "@nuxt/ui": "^2.13.0"
      },
      devDependencies: {
        "nuxt-edgedb-module": "latest",
        "@edgedb/generate": "0.4.1",
        "@nuxt/devtools": "latest",
        "nuxt": "latest"
      },
    });
  },
};

export default recipe;

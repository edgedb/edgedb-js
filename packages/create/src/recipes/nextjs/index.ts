import path from "node:path";
import * as p from "@clack/prompts";
import debug from "debug";
import { updatePackage } from "write-package";

import { BaseOptions, Recipe } from "../types.js";
import { copyTemplateFiles } from "../../utils.js";

const logger = debug("@edgedb/create:recipe:nextjs");

interface NextjsOptions {
  router: "app" | "pages";
}

const recipe: Recipe<NextjsOptions> = {
  skip(opts: BaseOptions) {
    return opts.framework !== "next";
  },
  getOptions() {
    return p.group({
      router: () =>
        p.select<
          { value: NextjsOptions["router"]; label: string }[],
          NextjsOptions["router"]
        >({
          message: "Use App router or Pages router?",
          options: [
            { value: "app", label: "App Router" },
            { value: "pages", label: "Pages Router" },
          ],
        }),
    });
  },
  async apply(
    { projectDir, useEdgeDBAuth }: BaseOptions,
    { router }: NextjsOptions
  ) {
    logger("Running nextjs recipe");

    const dirname = path.dirname(new URL(import.meta.url).pathname);

    const tags = new Set<string>([router]);

    if (useEdgeDBAuth) {
      tags.add("auth");
    }

    await copyTemplateFiles(
      path.resolve(dirname, "./template"),
      projectDir,
      tags
    );

    await updatePackage(projectDir, {
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        lint: "next lint",
      },
      dependencies: {
        ...(useEdgeDBAuth ? { "@edgedb/auth-nextjs": "^0.1.0-beta.1" } : {}),
        edgedb: "^1.4.1",
        react: "^18",
        "react-dom": "^18",
        next: "14.0.4",
      },
      devDependencies: {
        typescript: "^5",
        "@types/node": "^20",
        "@types/react": "^18",
        "@types/react-dom": "^18",
      },
    });
  },
};

export default recipe;

import path from "node:path";
import * as p from "@clack/prompts";
import debug from "debug";
import { updatePackage } from "write-package";

import type { BaseOptions, Recipe } from "../types.js";
import { copyTemplateFiles } from "../../utils.js";

const logger = debug("@edgedb/create:recipe:nextjs");

interface NextjsOptions {
  useTS: boolean;
  router: "app" | "pages";
  useTailwind: boolean;
  useSrcDir: boolean;
}

const recipe: Recipe<NextjsOptions> = {
  skip(opts: BaseOptions) {
    return opts.framework !== "next";
  },
  getOptions() {
    return p.group({
      useTS: () =>
        p.confirm({
          message: "Would you like to use TypeScript?",
          initialValue: true,
        }),
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
      useTailwind: () =>
        p.confirm({
          message: "Use Tailwind CSS?",
        }),
      useSrcDir: () =>
        p.confirm({
          message: "Use `src/` directory?",
        }),
    });
  },
  async apply(
    { projectDir, useEdgeDBAuth }: BaseOptions,
    { useTS, router, useTailwind, useSrcDir }: NextjsOptions
  ) {
    logger("Running nextjs recipe");

    const dirname = path.dirname(new URL(import.meta.url).pathname);

    const tags = new Set<string>([router, useTailwind ? "tw" : "no-tw"]);

    if (useEdgeDBAuth) {
      tags.add("auth");
    }

    await copyTemplateFiles(
      path.resolve(dirname, useTS ? "./template/ts" : "./template/js"),
      projectDir,
      {
        tags,
        rewritePath: !useSrcDir
          ? (p) => (p === path.join(projectDir, "src") ? projectDir : p)
          : undefined,
        injectVars: [
          {
            varname: "srcDir",
            value: useSrcDir ? "src/" : "",
            files: [
              "tsconfig.json",
              "jsconfig.json",
              "tailwind.config.ts",
              "tailwind.config.js",
              "src/app/page.tsx",
              "src/app/page.jsx",
              "src/pages/index.tsx",
              "src/pages/index.jsx",
            ],
          },
        ],
      }
    );

    await updatePackage(projectDir, {
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        lint: "next lint",
      },
      dependencies: {
        ...(useEdgeDBAuth ? { "@edgedb/auth-nextjs": "^0.1.0" } : {}),
        edgedb: "^1.4.1",
        react: "^18",
        "react-dom": "^18",
        next: "14.0.4",
      },
      devDependencies: {
        ...(useTS
          ? {
              typescript: "^5",
              "@types/node": "^20",
              "@types/react": "^18",
              "@types/react-dom": "^18",
            }
          : {}),
        ...(useTailwind
          ? { autoprefixer: "^10.0.1", postcss: "^8", tailwindcss: "^3.3.0" }
          : {}),
      },
    });
  },
};

export default recipe;

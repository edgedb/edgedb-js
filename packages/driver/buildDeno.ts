import { run } from "../../compileForDeno.ts";

const denoTestFiles = new Set([
  "test/testbase.ts",
  "test/client.test.ts",
  "test/credentials.test.ts",
  "test/credentials1.json",
]);

await run({
  sourceDir: "./src",
  destDir: "../deno",
  destEntriesToClean: ["_src", "mod.ts"],
  sourceFilter: (path) => {
    const doesMatch =
      !/cli\.mts$/.test(path) ||
      !/\/syntax\//.test(path) ||
      path.includes("deno.json");
    return doesMatch;
  },
  pathRewriteRules: [
    { match: /^src\/index.node.ts$/, replace: "mod.ts" },
    { match: /^src\/deno.json$/, replace: "deno.json" },
    { match: /^src\//, replace: "_src/" },
  ],
  injectImports: [
    {
      imports: ["process"],
      from: "src/globals.deno.ts",
    },
    {
      imports: ["Buffer"],
      from: "src/globals.deno.ts",
    },
  ],
}).then(() =>
  run({
    sourceDir: "./test",
    destDir: "../deno/test",
    sourceFilter: (path: any) => {
      return denoTestFiles.has(path);
    },
    pathRewriteRules: [{ match: /^test\//, replace: "" }],
    importRewriteRules: [
      {
        match: /^\.\.\/src\/index.node$/,
        replace: "../mod.ts",
      },
      {
        match: /^globals.deno.ts$/,
        replace: "../globals.deno.ts",
      },
      {
        match: /^\.\.\/src\/.+/,
        replace: (match) =>
          `${match.replace(/^\.\.\/src\//, "../_src/")}${
            match.endsWith(".ts") ? "" : ".ts"
          }`,
      },
      {
        match: /^fast-check$/,
        replace: "npm:fast-check",
      },
      {
        match: /^node:.*$/,
        replace: (match) => match,
      },
    ],
    injectImports: [
      {
        imports: [
          "process",
          "Buffer",
          "test",
          "expect",
          "jest",
          "describe",
          "beforeAll",
          "afterAll",
          "it",
        ],
        from: "src/globals.deno.ts",
      },
      // {
      //   imports: ["test", "expect", "jest"],
      //   from: "test/globals.deno.ts",
      // },
    ],
  }),
);

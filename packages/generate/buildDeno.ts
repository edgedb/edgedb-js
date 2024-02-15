import {run} from "../../compileForDeno.ts";

await run({
  sourceDir: "./src",
  destDir: "../deno/_generate",
  sourceFilter: (path) => !/src\/syntax/.test(path),
  pathRewriteRules: [{ match: /src\//, replace: "./" }],
  importRewriteRules: [
    {
      match: /^@iarna\/toml$/,
      replace: "https://deno.land/std@0.216.0/toml/mod.ts",
    },
    {
      match: /^edgedb\/dist\//,
      replace: (match, path) => {
        return path?.includes("src/generators")
          ? match.replace(/^edgedb\/dist\//, "../../_src/")
          : match.replace(/^edgedb\/dist\//, "../_src/");
      },
    },
    {
      match: /^edgedb$/,
      replace: "../mod.ts",
    },
    {
      match: /^\.\.\/\.\.\/src\/.+/,
      replace: (match) =>
        `${match.replace(/^\.\.\/\.\.\/src\//, "../_src/")}${
          match.endsWith(".ts") ? "" : ".ts"
        }`,
    },
  ],
}).then(async () => {
  await Deno.writeTextFile(
    "../deno/generate.ts",
    `
export * from "./_generate/cli.ts";
    `
  );
});

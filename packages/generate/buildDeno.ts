import { run } from "../../compileForDeno.ts";

await run({
  sourceDir: "./src",
  destDir: "../deno/_generate",
  sourceFilter: (path) => !/src\/syntax/.test(path),
  pathRewriteRules: [{ match: /src\//, replace: "./" }],
  importRewriteRules: [
    {
      match: /^@iarna\/toml$/,
      replace: "https://deno.land/std@0.208.0/toml/mod.ts",
    },
    {
      match: /^debug$/,
      replace: "https://deno.land/x/debug/mod.ts",
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
      replace: (match) => {
        let newPath = match.replace(/^\.\.\/\.\.\/src\//, "../_src/");

        if (newPath.endsWith(".js")) {
          newPath = newPath.replace(/\.js$/, ".ts");
        } else if (!newPath.endsWith(".ts")) {
          newPath += ".ts";
        }

        return newPath;
      },
    },
  ],
}).then(async () => {
  await Deno.writeTextFile(
    "../deno/generate.ts",
    `
export * from "./_generate/cli.ts";
    `,
  );
});

import {run} from "../../compileForDeno.ts";

const denoTestFiles = new Set([
  "test/testbase.ts",
  "test/client.test.ts",
  "test/credentials.test.ts",
  "test/credentials1.json"
]);

await run({
  sourceDir: "./src",
  destDir: "../deno",
  destEntriesToClean: ["_src", "mod.ts"],
  sourceFilter: path => {
    return !/\/syntax\//.test(path);
  },
  pathRewriteRules: [
    {match: /^src\/index.node.ts$/, replace: "mod.ts"},
    {match: /^src\//, replace: "_src/"}
  ],
  injectImports: [
    {
      imports: ["Buffer", "process"],
      from: "src/globals.deno.ts"
    }
  ]
}).then(async () =>
  run({
    sourceDir: "./test",
    destDir: "../deno/test",
    sourceFilter: path => {
      return denoTestFiles.has(path);
    },
    pathRewriteRules: [{match: /^test\//, replace: ""}],
    importRewriteRules: [
      {
        match: /^\.\.\/src\/index.node$/,
        replace: "../mod.ts"
      },
      {
        match: /^globals.deno.ts$/,
        replace: "../globals.deno.ts"
      },
      {
        match: /^\.\.\/src\/.+/,
        replace: match =>
          `${match.replace(/^\.\.\/src\//, "../_src/")}${
            match.endsWith(".ts") ? "" : ".ts"
          }`
      }
    ],
    injectImports: [
      {
        imports: ["Buffer", "process", "test", "expect", "jest"],
        from: "src/globals.deno.ts"
      }
      // {
      //   imports: ["test", "expect", "jest"],
      //   from: "test/globals.deno.ts",
      // },
    ]
  })
);

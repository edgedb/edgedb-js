import {ensureDir, walk} from "https://deno.land/std@0.114.0/fs/mod.ts";
import {
  basename,
  dirname,
  join,
  relative,
} from "https://deno.land/std@0.114.0/path/posix.ts";
import {createRequire} from "https://deno.land/std@0.114.0/node/module.ts";

const require = createRequire(import.meta.url);

const ts = require("typescript");

const normalisePath = (path: string) => path.replace(/\\/g, "/");
const denoTestFiles = new Set([
  "test/testbase.ts",
  "test/client.test.ts",
  "test/credentials.test.ts",
]);

await run({
  sourceDir: "./src",
  destDir: "./edgedb-deno",
  destEntriesToClean: ["_src", "mod.ts"],
  sourceFilter: path => {
    return !/\/syntax\//.test(path);
  },
  pathRewriteRules: [
    {match: /^src\/index.node.ts$/, replace: "mod.ts"},
    {match: /^src\//, replace: "_src/"},
  ],
  injectImports: [
    {
      imports: ["Buffer", "process"],
      from: "src/globals.deno.ts",
    },
  ],
})
  .then(async () =>
    run({
      sourceDir: "./test",
      destDir: "./test/deno",
      sourceFilter: path => {
        return denoTestFiles.has(path);
      },
      pathRewriteRules: [{match: /^test\//, replace: ""}],
      importRewriteRules: [
        {
          match: /^\.\.\/src\/index.node$/,
          replace: "../../edgedb-deno/mod.ts",
        },
        {
          match: /^globals.deno.ts$/,
          replace: "../globals.deno.ts",
        },
        {
          match: /^\.\.\/src\/.+/,
          replace: match =>
            `${match.replace(/^\.\.\/src\//, "../../edgedb-deno/_src/")}${
              match.endsWith(".ts") ? "" : ".ts"
            }`,
        },
      ],
      injectImports: [
        {
          imports: ["Buffer", "process"],
          from: "src/globals.deno.ts",
        },
        {
          imports: ["test", "expect", "jest"],
          from: "test/globals.deno.ts",
        },
      ],
    })
  )
  .then(async () =>
    Deno.writeTextFile(
      "./edgedb-deno/generate.ts",
      `
export * from "./_src/reflection/cli.ts";
    `
    )
  );

async function run({
  sourceDir,
  destDir,
  destEntriesToClean,
  pathRewriteRules = [],
  importRewriteRules = [],
  injectImports = [],
  sourceFilter,
}: {
  sourceDir: string;
  destDir: string;
  destEntriesToClean?: string[];
  pathRewriteRules?: {match: RegExp; replace: string}[];
  importRewriteRules?: {
    match: RegExp;
    replace: string | ((match: string) => string);
  }[];
  injectImports?: {imports: string[]; from: string}[];
  sourceFilter?: (path: string) => boolean;
}) {
  console.log(`Denoifying ${sourceDir}...`);
  const destClean = new Set(destEntriesToClean);
  try {
    for await (const entry of Deno.readDir(destDir)) {
      if (!destEntriesToClean || destClean.has(entry.name)) {
        await Deno.remove(join(destDir, entry.name), {recursive: true});
      }
    }
  } catch {}

  const sourceFilePathMap = new Map<string, string>();

  for await (const entry of walk(sourceDir, {includeDirs: false})) {
    const sourcePath = normalisePath(entry.path);
    if (sourceFilter && !sourceFilter(sourcePath)) {
      continue;
    }
    sourceFilePathMap.set(sourcePath, resolveDestPath(sourcePath));
  }

  for (const [sourcePath, destPath] of sourceFilePathMap) {
    compileFileForDeno(sourcePath, destPath);
  }

  async function compileFileForDeno(sourcePath: string, destPath: string) {
    const file = await Deno.readTextFile(sourcePath);
    await ensureDir(dirname(destPath));

    if (destPath.endsWith(".deno.ts")) {
      return await Deno.writeTextFile(destPath, file);
    }

    if (destPath.endsWith(".node.ts")) {
      return;
    }

    const parsedSource = ts.createSourceFile(
      basename(sourcePath),
      file,
      ts.ScriptTarget.Latest,
      false,
      ts.ScriptKind.TS
    );

    const rewrittenFile: string[] = [];
    let cursor = 0;
    let isFirstNode = true;
    parsedSource.forEachChild((node: any) => {
      if (isFirstNode) {
        isFirstNode = false;

        const neededImports = injectImports.reduce(
          (neededImports, {imports, from}) => {
            const usedImports = imports.filter(importName =>
              parsedSource.identifiers?.has(importName)
            );
            if (usedImports.length) {
              neededImports.push({
                imports: usedImports,
                from,
              });
            }
            return neededImports;
          },
          [] as {imports: string[]; from: string}[]
        );

        if (neededImports.length) {
          const importDecls = neededImports.map(neededImport => {
            const imports = neededImport.imports.join(", ");
            // no need to resolve path if it is import from url
            const importPath = neededImport.from.startsWith("https://")
              ? neededImport.from
              : resolveImportPath(
                  relative(dirname(sourcePath), neededImport.from),
                  sourcePath
                );
            return `import {${imports}} from "${importPath}";`;
          });

          const importDecl = importDecls.join("\n") + "\n\n";

          const injectPos =
            node.getLeadingTriviaWidth?.(parsedSource) ?? node.pos;
          rewrittenFile.push(file.slice(cursor, injectPos));
          rewrittenFile.push(importDecl);
          cursor = injectPos;
        }
      }

      if (
        (node.kind === ts.SyntaxKind.ImportDeclaration ||
          node.kind === ts.SyntaxKind.ExportDeclaration) &&
        node.moduleSpecifier
      ) {
        const pos = node.moduleSpecifier.pos + 2;
        const end = node.moduleSpecifier.end - 1;

        rewrittenFile.push(file.slice(cursor, pos));
        cursor = end;

        const importPath = file.slice(pos, end);

        let resolvedImportPath = resolveImportPath(importPath, sourcePath);

        if (resolvedImportPath.endsWith("/adapter.node.ts")) {
          resolvedImportPath = resolvedImportPath.replace(
            "/adapter.node.ts",
            "/adapter.deno.ts"
          );
        }

        rewrittenFile.push(resolvedImportPath);
      }
    });
    rewrittenFile.push(file.slice(cursor));
    let contents = rewrittenFile.join("");
    if (destPath.includes("index.shared.ts")) {
      contents = await replaceVersionNumber(contents);
    }
    if (/__dirname/g.test(contents)) {
      contents = contents.replaceAll(
        /__dirname/g,
        "new URL('.', import.meta.url).pathname"
      );
    }

    await Deno.writeTextFile(destPath, contents);
  }

  function resolveDestPath(sourcePath: string) {
    let destPath = sourcePath;
    for (const rule of pathRewriteRules) {
      destPath = destPath.replace(rule.match, rule.replace);
    }
    return join(destDir, destPath);
  }

  function resolveImportPath(importPath: string, sourcePath: string) {
    // First check importRewriteRules
    for (const rule of importRewriteRules) {
      if (rule.match.test(importPath)) {
        const path = importPath.replace(rule.match, rule.replace as string);
        if (!path.endsWith(".ts")) return path + ".ts";
        return path;
      }
    }

    // then resolve normally
    let resolvedPath = join(dirname(sourcePath), importPath);
    if (!sourceFilePathMap.has(resolvedPath)) {
      // If importPath doesn't exist, first try appending '.ts'
      resolvedPath = join(dirname(sourcePath), importPath + ".ts");

      if (!sourceFilePathMap.has(resolvedPath)) {
        // If that path doesn't exist, next try appending '/index.ts'
        resolvedPath = join(dirname(sourcePath), importPath + "/index.ts");

        if (!sourceFilePathMap.has(resolvedPath)) {
          throw new Error(
            `Cannot find imported file '${importPath}' in '${sourcePath}'`
          );
        }
      }
    }

    const relImportPath = relative(
      dirname(sourceFilePathMap.get(sourcePath)!),
      sourceFilePathMap.get(resolvedPath)!
    );
    return relImportPath.startsWith("../")
      ? relImportPath
      : "./" + relImportPath;
  }
}

async function replaceVersionNumber(contents: string) {
  // update the version string literal
  const packagePath = new URL("../package.json", import.meta.url);
  const packageText = await Deno.readTextFile(packagePath);
  const {version} = JSON.parse(packageText);

  const updated = contents.replace(
    /_edgedbJsVersion = "(.+)"/g,
    (match: string, group: string) => {
      return match.replace(group, version);
    }
  );
  return updated;
}

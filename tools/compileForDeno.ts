import {walk, ensureDir} from "https://deno.land/std@0.90.0/fs/mod.ts";
import {
  join,
  relative,
  dirname,
  basename,
} from "https://deno.land/std@0.90.0/path/mod.ts";
import {createRequire} from "https://deno.land/std@0.90.0/node/module.ts";

const sourceDir = "./src";
const destDir = "./edgedb-deno";
const pathRewriteRules = [
  {match: /^src\/index.node.ts$/, replace: "mod.ts"},
  {match: /^src\//, replace: "_src/"},
];
const injectImports = {
  imports: ["Buffer", "process"],
  from: "src/globals.deno.ts",
};

const require = createRequire(import.meta.url);

const ts = require("typescript");

try {
  await Deno.remove(destDir, {recursive: true});
} catch {}

const sourceFilePathMap = new Map<string, string>();

for await (const entry of walk(sourceDir, {includeDirs: false})) {
  const sourcePath = entry.path;
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

      const neededImports = injectImports.imports.filter((importName) =>
        parsedSource.identifiers?.has(importName)
      );

      if (neededImports.length) {
        const imports = neededImports.join(", ");
        const importPath = resolveImportPath(
          relative(dirname(sourcePath), injectImports.from),
          sourcePath
        );

        const importDecl = `import {${imports}} from "${importPath}";\n\n`;

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

  await Deno.writeTextFile(destPath, rewrittenFile.join(""));
}

function resolveDestPath(sourcePath: string) {
  let destPath = sourcePath;
  for (const rule of pathRewriteRules) {
    destPath = destPath.replace(rule.match, rule.replace);
  }
  return join(destDir, destPath);
}

function resolveImportPath(importPath: string, sourcePath: string) {
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

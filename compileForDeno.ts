import { ensureDir, walk } from "https://deno.land/std@0.177.0/fs/mod.ts";
import {
  basename,
  dirname,
  join,
  relative,
} from "https://deno.land/std@0.177.0/path/posix.ts";

import ts from "npm:typescript";

const normalisePath = (path: string) => path.replace(/\\/g, "/");

export async function run({
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
  pathRewriteRules?: { match: RegExp; replace: string }[];
  importRewriteRules?: {
    match: RegExp;
    replace: string | ((match: string, sourcePath?: string) => string);
  }[];
  injectImports?: { imports: string[]; from: string }[];
  sourceFilter?: (path: string) => boolean;
}) {
  console.log(`Denoifying ${sourceDir}...`);
  const destClean = new Set(destEntriesToClean);
  try {
    for await (const entry of Deno.readDir(destDir)) {
      if (!destEntriesToClean || destClean.has(entry.name)) {
        await Deno.remove(join(destDir, entry.name), { recursive: true });
      }
    }
  } catch {}

  const sourceFilePathMap = new Map<string, string>();

  for await (const entry of walk(sourceDir, { includeDirs: false })) {
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
      ts.ScriptKind.TS,
    );

    const rewrittenFile: string[] = [];
    let cursor = 0;
    let isFirstNode = true;
    parsedSource.forEachChild((node: any) => {
      if (isFirstNode) {
        isFirstNode = false;

        const neededImports = injectImports.reduce(
          (neededImports, { imports, from }) => {
            const usedImports = imports.filter((importName) =>
              parsedSource.identifiers?.has(importName),
            );
            if (usedImports.length) {
              neededImports.push({
                imports: usedImports,
                from,
              });
            }
            return neededImports;
          },
          [] as { imports: string[]; from: string }[],
        );

        if (neededImports.length) {
          const importDecls = neededImports.map((neededImport) => {
            const imports = neededImport.imports.join(", ");
            // no need to resolve path if it is import from a supported protocol
            const importPath = _pathUsesSupportedProtocol(neededImport.from)
              ? neededImport.from
              : resolveImportPath(
                  relative(dirname(sourcePath), neededImport.from),
                  sourcePath,
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

        for (const name of ["adapter", "adapter.shared", "adapter.crypto"]) {
          if (resolvedImportPath.endsWith(`/${name}.node.ts`)) {
            resolvedImportPath = resolvedImportPath.replace(
              `/${name}.node.ts`,
              `/${name}.deno.ts`,
            );
          }
        }

        rewrittenFile.push(resolvedImportPath);
      }
    });
    rewrittenFile.push(file.slice(cursor));
    let contents = rewrittenFile.join("");

    if (/__dirname/g.test(contents)) {
      contents = contents.replaceAll(
        /__dirname/g,
        "new URL('.', import.meta.url).pathname",
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
        const path = importPath.replace(rule.match, (match) =>
          typeof rule.replace === "function"
            ? rule.replace(match, sourcePath)
            : rule.replace,
        );
        if (path.endsWith(".js")) {
          path.replace(".js", ".ts");
        } else if (
          !path.endsWith(".ts") &&
          !path.startsWith("node:") &&
          !path.startsWith("npm:")
        )
          return path + ".ts";
        return path;
      }
    }

    // Then check if importPath is already a supported protocol
    if (_pathUsesSupportedProtocol(importPath)) {
      return importPath;
    }

    // then resolve normally
    let resolvedPath = join(dirname(sourcePath), importPath);

    if (!sourceFilePathMap.has(resolvedPath)) {
      // If importPath doesn't exist, first try appending '.ts'
      if (importPath.endsWith(".js")) {
        resolvedPath = join(
          dirname(sourcePath),
          importPath.slice(0, -3) + ".ts",
        );
      } else {
        resolvedPath = join(dirname(sourcePath), importPath + ".ts");
      }

      if (!sourceFilePathMap.has(resolvedPath)) {
        // If that path doesn't exist, next try appending '/index.ts'
        resolvedPath = join(dirname(sourcePath), importPath + "/index.ts");

        if (!sourceFilePathMap.has(resolvedPath)) {
          throw new Error(
            `Cannot find imported file '${importPath}' in '${sourcePath}'`,
          );
        }
      }
    }

    const relImportPath = relative(
      dirname(sourceFilePathMap.get(sourcePath)!),
      sourceFilePathMap.get(resolvedPath)!,
    );
    return relImportPath.startsWith("../")
      ? relImportPath
      : "./" + relImportPath;
  }
}

function _pathUsesSupportedProtocol(path: string) {
  return (
    path.startsWith("https:") ||
    path.startsWith("node:") ||
    path.startsWith("npm:")
  );
}

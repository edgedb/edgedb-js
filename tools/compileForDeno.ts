import {
  join,
  relative,
  dirname,
  basename,
} from "https://deno.land/std@0.89.0/path/mod.ts";
import {createRequire} from "https://deno.land/std@0.89.0/node/module.ts";

const require = createRequire(import.meta.url);

const ts = require("typescript");

const targetDir = "./edgedb-deno/_src";
const injectImports = [
  {
    imports: ["Buffer", "process"],
    from: "./src/globals.deno.ts",
  },
];

try {
  await Deno.remove(targetDir, {recursive: true});
} catch {}

async function compileFileForDeno(filePath: string, outPath: string) {
  const isIndex = filePath.endsWith("index.node.ts");

  if (filePath.endsWith(".node.ts") && !isIndex) {
    return;
  }

  if (isIndex) {
    outPath = join(dirname(outPath), "../mod.ts");
  }

  const file = await Deno.readTextFile(filePath);

  if (filePath.endsWith(".deno.ts")) {
    return await Deno.writeTextFile(outPath, file);
  }

  const parsedSource = ts.createSourceFile(
    basename(filePath),
    file,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS
  );

  const rewrittenFile: string[] = [];
  let cursor = 0;
  let firstNode = true;
  parsedSource.forEachChild((node: any) => {
    if (firstNode) {
      firstNode = false;

      const injected = injectImports
        .map(({imports, from}) => {
          const imported = imports.filter((importName) =>
            parsedSource.identifiers?.has(importName)
          );
          if (!imported.length) {
            return null;
          }
          return `import {${imported.join(", ")}} from "./${relative(
            dirname(filePath),
            from
          )}";`;
        })
        .filter((importStr) => importStr);

      if (injected.length) {
        const injectPos =
          node.getLeadingTriviaWidth?.(parsedSource) ?? node.pos;
        rewrittenFile.push(file.slice(cursor, injectPos));
        rewrittenFile.push(`${injected.join("\n")}\n\n`);
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

      const path = file.slice(pos, end);

      if (path.endsWith("./adapter.node")) {
        rewrittenFile.push(
          path.replace("./adapter.node", "./adapter.deno.ts")
        );
        return;
      }

      let resolvedPath = file.slice(pos, end);

      if (!fileExists(join(dirname(filePath), resolvedPath) + ".ts")) {
        resolvedPath += "/index";

        if (!fileExists(join(dirname(filePath), resolvedPath) + ".ts")) {
          throw new Error(`Cannot find file: ${path} in ${filePath}`);
        }
      }

      if (isIndex) {
        resolvedPath = "./" + join("_src", resolvedPath);
      }

      rewrittenFile.push(resolvedPath + ".ts");
    }
  });
  rewrittenFile.push(file.slice(cursor));

  await Deno.writeTextFile(outPath, rewrittenFile.join(""));
}

async function compileDir(dirPath: string, outDirPath: string) {
  await Deno.mkdir(join(outDirPath), {recursive: true});

  for await (const dirEntry of Deno.readDir(dirPath)) {
    if (dirEntry.isFile) {
      const filePath = join(dirPath, dirEntry.name);

      compileFileForDeno(filePath, join(outDirPath, dirEntry.name));
    }
    if (dirEntry.isDirectory) {
      compileDir(
        join(dirPath, dirEntry.name),
        join(outDirPath, dirEntry.name)
      );
    }
  }
}

function fileExists(filePath: string) {
  try {
    Deno.statSync(filePath);
    return true;
  } catch (e) {
    return false;
  }
}

await compileDir("./src", targetDir);

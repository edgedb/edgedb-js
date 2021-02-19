import {
  join,
  relative,
  dirname,
} from "https://deno.land/std@0.87.0/path/mod.ts";

const injectImports = [
  {
    imports: ["Buffer", "process"],
    from: "./src/globals.deno.ts",
  },
];

await Deno.remove("./deno", {recursive: true});

async function compileFileForDeno(filePath: string, outPath: string) {
  if (filePath.endsWith(".node.ts") && !filePath.endsWith("index.node.ts")) {
    return;
  }

  const file = await Deno.readTextFile(filePath);

  if (filePath.endsWith(".deno.ts")) {
    return await Deno.writeTextFile(outPath, file);
  }

  let injectedImports = injectImports
    .map(({imports, from}) => {
      const imported = imports.filter((importName) =>
        file.includes(importName)
      );
      if (!imported.length) {
        return null;
      }
      return `import {${imported.join(", ")}} from "./${relative(
        dirname(filePath),
        from
      )}";`;
    })
    .filter((importStr) => importStr)
    .join("\n");

  injectedImports += injectedImports ? "\n" : "";

  const replacedFile = file.replace(
    /(?:import|export)\s(?:.|\n|\r)*?\sfrom\s+["'](.+)['"]/g,
    (match: string, path: string) => {
      if (path.endsWith("./adaptor.node")) {
        return match.replace("./adaptor.node", "./adaptor.deno.ts");
      }

      const pathIndex = match.lastIndexOf(path);

      let resolvedPath = path;

      if (!fileExists(join(dirname(filePath), resolvedPath) + ".ts")) {
        resolvedPath += "/index";

        if (!fileExists(join(dirname(filePath), resolvedPath) + ".ts")) {
          throw new Error(`Cannot find file: ${path} in ${filePath}`);
        }
      }

      return (
        match.slice(0, pathIndex) +
        resolvedPath +
        ".ts" +
        match.slice(pathIndex + path.length)
      );
    }
  );

  await Deno.writeTextFile(outPath, injectedImports + replacedFile);
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

await compileDir("./src", "./deno");

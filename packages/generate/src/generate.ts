import {DirBuilder, dts, r, t} from "./builders";
import {createClient, Client, adapter, $} from "edgedb";
import {syntax} from "./FILES";
import type {ConnectConfig} from "edgedb/dist/conUtils";

import * as genutil from "./genutil";

import {generateCastMaps} from "./edgeql-js/generateCastMaps";
import {generateScalars} from "./edgeql-js/generateScalars";
import {generateObjectTypes} from "./edgeql-js/generateObjectTypes";
import {generateRuntimeSpec} from "./edgeql-js/generateRuntimeSpec";
import {generateFunctionTypes} from "./edgeql-js/generateFunctionTypes";
import {generateOperators} from "./edgeql-js/generateOperatorTypes";
import {generateGlobals} from "./edgeql-js/generateGlobals";
import {generateSetImpl} from "./edgeql-js/generateSetImpl";

const {fs, path, exists, readFileUtf8, exit, walk} = adapter;
const DEBUG = false;

export const configFileHeader = `// EdgeDB query builder. To update, run \`npx @edgedb/generate edgeql-js\``;

export type GeneratorParams = {
  dir: DirBuilder;
  types: $.introspect.Types;
  typesByName: Record<string, $.introspect.Type>;
  casts: $.introspect.Casts;
  scalars: $.introspect.ScalarTypes;
  functions: $.introspect.FunctionTypes;
  globals: $.introspect.Globals;
  operators: $.introspect.OperatorTypes;
};

export function exitWithError(message: string): never {
  // tslint:disable-next-line
  console.error(message);
  exit(1);
  throw new Error();
}

export type Target = "ts" | "esm" | "cjs" | "mts" | "deno";
export type Version = {
  major: number;
  minor: number;
};

export async function generateQB(params: {
  outputDir: string;
  connectionConfig: ConnectConfig;
  target: Target;
}): Promise<void> {
  const {outputDir, connectionConfig, target} = params;
  // tslint:disable-next-line
  // console.log(`Connecting to EdgeDB instance...`);
  let cxn: Client;
  try {
    cxn = createClient({
      ...connectionConfig,
      concurrency: 5
    });
  } catch (e) {
    return exitWithError(`Failed to connect: ${(e as Error).message}`);
  }

  const dir = new DirBuilder();

  try {
    // tslint:disable-next-line
    console.log(`Introspecting database schema...`);

    const [types, scalars, casts, functions, operators, globals] =
      await Promise.all([
        $.introspect.getTypes(cxn, {debug: DEBUG}),
        $.introspect.getScalars(cxn),
        $.introspect.getCasts(cxn, {debug: DEBUG}),
        $.introspect.getFunctions(cxn),
        $.introspect.getOperators(cxn),
        $.introspect.getGlobals(cxn)
      ]);

    const typesByName: Record<string, $.introspect.Type> = {};
    for (const type of types.values()) {
      typesByName[type.name] = type;

      // skip "anytype" and "anytuple"
      if (!type.name.includes("::")) continue;
    }

    const generatorParams: GeneratorParams = {
      dir,
      types,
      typesByName,
      casts,
      scalars,
      functions,
      globals,
      operators
    };
    generateRuntimeSpec(generatorParams);
    generateCastMaps(generatorParams);
    generateScalars(generatorParams);
    generateObjectTypes(generatorParams);
    generateFunctionTypes(generatorParams);
    generateOperators(generatorParams);
    generateSetImpl(generatorParams);
    generateGlobals(generatorParams);

    // generate module imports

    const importsFile = dir.getPath("imports");

    importsFile.addExportStar("edgedb", {as: "edgedb"});
    importsFile.addExportFrom({spec: true}, "./__spec__", {
      allowFileExt: true
    });
    importsFile.addExportStar("./syntax", {
      allowFileExt: true,
      as: "syntax"
    });
    importsFile.addExportStar("./castMaps", {
      allowFileExt: true,
      as: "castMaps"
    });

    /////////////////////////
    // generate index file
    /////////////////////////

    const index = dir.getPath("index");
    // index.addExportStar(null, "./castMaps", true);
    index.addExportStar("./external", {
      allowFileExt: true
    });
    index.addExportStar("./types", {
      allowFileExt: true,
      modes: ["ts", "dts", "js"]
    });

    index.addImportStar("$", "./reflection");
    index.addExportFrom({createClient: true}, "edgedb");
    index.addImportStar("$syntax", "./syntax", {allowFileExt: true});
    index.addImportStar("$op", "./operators", {allowFileExt: true});

    const spreadModules = [
      {
        name: "$op",
        keys: ["op"]
      },
      {
        name: "$syntax",
        keys: [
          "ASC",
          "DESC",
          "EMPTY_FIRST",
          "EMPTY_LAST",
          "alias",
          "array",
          "cast",
          "detached",
          "for",
          "insert",
          "is",
          "literal",
          "namedTuple",
          "optional",
          "select",
          "set",
          "tuple",
          "with",
          "withParams"
        ]
      },
      {
        name: "_default",
        module: dir.getModule("default")
      },
      {name: "_std", module: dir.getModule("std")}
    ];
    const excludedKeys = new Set<string>(dir._modules.keys());

    const spreadTypes: string[] = [];
    for (let {name, keys, module} of spreadModules) {
      if (module?.isEmpty()) {
        continue;
      }
      keys = keys ?? module!.getDefaultExportKeys();
      const conflictingKeys = keys.filter(key => excludedKeys.has(key));
      let typeStr: string;
      if (conflictingKeys.length) {
        typeStr = `Omit<typeof ${name}, ${conflictingKeys
          .map(genutil.quote)
          .join(" | ")}>`;
      } else {
        typeStr = `typeof ${name}`;
      }
      spreadTypes.push(
        name === "$syntax" ? `$.util.OmitDollarPrefixed<${typeStr}>` : typeStr
      );
      for (const key of keys) {
        excludedKeys.add(key);
      }
    }

    index.nl();
    index.writeln([
      dts`declare `,
      `const ExportDefault`,
      t`: ${spreadTypes.reverse().join(" & \n  ")} & {`
    ]);
    index.indented(() => {
      for (const [moduleName, internalName] of dir._modules) {
        if (dir.getModule(moduleName).isEmpty()) continue;
        index.writeln([
          t`${genutil.quote(moduleName)}: typeof _${internalName};`
        ]);
      }
    });

    index.writeln([t`}`, r` = {`]);
    index.indented(() => {
      for (const {name, module} of [...spreadModules].reverse()) {
        if (module?.isEmpty()) {
          continue;
        }
        index.writeln([
          r`...${
            name === "$syntax" ? `$.util.omitDollarPrefixed($syntax)` : name
          },`
        ]);
      }

      for (const [moduleName, internalName] of dir._modules) {
        if (dir.getModule(moduleName).isEmpty()) {
          continue;
        }
        index.addImportDefault(
          `_${internalName}`,
          `./modules/${internalName}`,
          {allowFileExt: true}
        );

        index.writeln([r`${genutil.quote(moduleName)}: _${internalName},`]);
      }
    });
    index.writeln([r`};`]);
    index.addExportDefault("ExportDefault");

    // re-export some reflection types
    index.writeln([r`const Cardinality = $.Cardinality;`]);
    index.writeln([dts`declare `, t`type Cardinality = $.Cardinality;`]);
    index.addExport("Cardinality");
    index.writeln([
      t`export `,
      dts`declare `,
      t`type Set<
  Type extends $.BaseType,
  Card extends $.Cardinality = $.Cardinality.Many
> = $.TypeSet<Type, Card>;`
    ]);
  } finally {
    await cxn.close();
  }

  const initialFiles = new Set(await walk(outputDir));
  const written = new Set<string>();

  // write syntax files
  const syntaxOutDir = path.join(outputDir);
  if (!(await exists(syntaxOutDir))) {
    await fs.mkdir(syntaxOutDir);
  }

  const syntaxFiles = syntax[target];
  if (!syntaxFiles) {
    throw new Error(`Error: no syntax files found for target "${target}"`);
  }

  for (const f of syntaxFiles) {
    const outputPath = path.join(syntaxOutDir, f.path);
    written.add(outputPath);
    let oldContents = "";
    try {
      oldContents = await readFileUtf8(outputPath);
    } catch {}
    if (oldContents !== f.content) {
      await fs.writeFile(outputPath, f.content);
    }
  }

  if (target === "ts") {
    await dir.write(outputDir, {
      mode: "ts",
      moduleKind: "esm",
      fileExtension: ".ts",
      moduleExtension: "",
      written
    });
  } else if (target === "mts") {
    await dir.write(outputDir, {
      mode: "ts",
      moduleKind: "esm",
      fileExtension: ".mts",
      moduleExtension: ".mjs",
      written
    });
  } else if (target === "cjs") {
    await dir.write(outputDir, {
      mode: "js",
      moduleKind: "cjs",
      fileExtension: ".js",
      moduleExtension: "",
      written
    });
    await dir.write(outputDir, {
      mode: "dts",
      moduleKind: "esm",
      fileExtension: ".d.ts",
      moduleExtension: "",
      written
    });
  } else if (target === "esm") {
    await dir.write(outputDir, {
      mode: "js",
      moduleKind: "esm",
      fileExtension: ".mjs",
      moduleExtension: ".mjs",
      written
    });
    await dir.write(outputDir, {
      mode: "dts",
      moduleKind: "esm",
      fileExtension: ".d.ts",
      moduleExtension: "",
      written
    });
  } else if (target === "deno") {
    await dir.write(outputDir, {
      mode: "ts",
      moduleKind: "esm",
      fileExtension: ".ts",
      moduleExtension: ".ts",
      written
    });
  }

  const configPath = path.join(outputDir, "config.json");
  await fs.writeFile(
    configPath,
    `${configFileHeader}\n${JSON.stringify({target})}\n`
  );
  written.add(configPath);

  // delete all vestigial files
  for (const file of initialFiles) {
    if (written.has(file)) {
      continue;
    }
    await fs.rm(file);
  }
}

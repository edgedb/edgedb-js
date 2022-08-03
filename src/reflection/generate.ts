import {
  fs,
  path,
  exists,
  readFileUtf8,
  exit,
  srcDir,
  readDir,
} from "../adapter.node";

import {DirBuilder, dts, r, t} from "./builders";
import {createClient, Client, _edgedbJsVersion} from "../index.node";

import {ConnectConfig} from "../conUtils";

import {getCasts, Casts} from "./queries/getCasts";
import {getScalars, ScalarTypes} from "./queries/getScalars";
import {FunctionTypes, getFunctions} from "./queries/getFunctions";
import {getOperators, OperatorTypes} from "./queries/getOperators";
import {getGlobals, Globals} from "./queries/getGlobals";
import {getTypes, Types, Type} from "./queries/getTypes";
import * as genutil from "./util/genutil";

import {generateCastMaps} from "./generators/generateCastMaps";
import {generateScalars} from "./generators/generateScalars";
import {generateObjectTypes} from "./generators/generateObjectTypes";
import {generateRuntimeSpec} from "./generators/generateRuntimeSpec";
import {generateFunctionTypes} from "./generators/generateFunctionTypes";
import {generateOperators} from "./generators/generateOperatorTypes";
import {generateGlobals} from "./generators/generateGlobals";
import {generateSetImpl} from "./generators/generateSetImpl";

const DEBUG = false;

export const configFileHeader = `// EdgeDB query builder. To update, run \`npx edgeql-js\``;

export type GeneratorParams = {
  dir: DirBuilder;
  types: Types;
  typesByName: Record<string, Type>;
  casts: Casts;
  scalars: ScalarTypes;
  functions: FunctionTypes;
  globals: Globals;
  operators: OperatorTypes;
};

export function exitWithError(message: string): never {
  // tslint:disable-next-line
  console.error(message);
  exit(1);
  throw new Error();
}

export type Target = "ts" | "esm" | "cjs" | "mts";
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
  console.log(`Connecting to EdgeDB instance...`);
  let cxn: Client;
  try {
    cxn = createClient({
      ...connectionConfig,
      concurrency: 5,
    });
  } catch (e) {
    return exitWithError(`Failed to connect: ${(e as Error).message}`);
  }

  const dir = new DirBuilder();

  try {
    // tslint:disable-next-line
    console.log(`Introspecting database schema...`);
    const version = await cxn.queryRequiredSingle<Version>(
      `select sys::get_version();`
    );
    const [types, scalars, casts, functions, operators, globals] =
      await Promise.all([
        getTypes(cxn, {debug: DEBUG, version}),
        getScalars(cxn, {version}),
        getCasts(cxn, {debug: DEBUG, version}),
        getFunctions(cxn, {version}),
        getOperators(cxn, {version}),
        getGlobals(cxn, {version}),
      ]);

    const typesByName: Record<string, Type> = {};
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
      operators,
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
      allowFileExt: true,
    });
    importsFile.addExportStar("./syntax/syntax", {
      allowFileExt: true,
      as: "syntax",
    });
    importsFile.addExportStar("./castMaps", {
      allowFileExt: true,
      as: "castMaps",
    });

    /////////////////////////
    // generate index file
    /////////////////////////

    const index = dir.getPath("index");
    // index.addExportStar(null, "./castMaps", true);
    index.addExportStar("./syntax/external", {
      allowFileExt: true,
    });
    index.addExportStar("./types", {
      allowFileExt: true,
      modes: ["ts", "dts", "js"],
    });
    index.addImport({$: true, _edgedbJsVersion: true}, "edgedb");
    index.addExportFrom({createClient: true}, "edgedb");
    index.addImportStar("$syntax", "./syntax/syntax", {allowFileExt: true});
    index.addImportStar("$op", "./operators", {allowFileExt: true});

    index.writeln([
      r`\nif (_edgedbJsVersion !== "${_edgedbJsVersion}") {
  throw new Error(
    \`The query builder was generated by a different version of edgedb-js (v${_edgedbJsVersion})\` +
      \` than the one currently installed (v\${_edgedbJsVersion}).\\n\` +
      \`Run 'npx edgeql-js' to re-generate a compatible version.\\n\`
  );
}`,
    ]);

    const spreadModules = [
      {
        name: "$op",
        keys: ["op"],
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
          "withParams",
        ],
      },
      {
        name: "_default",
        module: dir.getModule("default"),
      },
      {name: "_std", module: dir.getModule("std")},
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
      t`: ${spreadTypes.reverse().join(" & \n  ")} & {`,
    ]);
    index.indented(() => {
      for (const [moduleName, internalName] of dir._modules) {
        if (dir.getModule(moduleName).isEmpty()) continue;
        index.writeln([
          t`${genutil.quote(moduleName)}: typeof _${internalName};`,
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
          },`,
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
  Cardinality extends $.Cardinality = $.Cardinality.Many
> = $.TypeSet<Type, Cardinality>;`,
    ]);
  } finally {
    await cxn.close();
  }

  if (target === "ts") {
    await dir.write(outputDir, {
      mode: "ts",
      moduleKind: "esm",
      fileExtension: ".ts",
      moduleExtension: "",
    });
  } else if (target === "mts") {
    await dir.write(outputDir, {
      mode: "ts",
      moduleKind: "esm",
      fileExtension: ".mts",
      moduleExtension: ".mjs",
    });
  } else if (target === "cjs") {
    await dir.write(outputDir, {
      mode: "js",
      moduleKind: "cjs",
      fileExtension: ".js",
      moduleExtension: "",
    });
    await dir.write(outputDir, {
      mode: "dts",
      moduleKind: "esm",
      fileExtension: ".d.ts",
      moduleExtension: "",
    });
  } else if (target === "esm") {
    await dir.write(outputDir, {
      mode: "js",
      moduleKind: "esm",
      fileExtension: ".mjs",
      moduleExtension: ".mjs",
    });
    await dir.write(outputDir, {
      mode: "dts",
      moduleKind: "esm",
      fileExtension: ".d.ts",
      moduleExtension: "",
    });
  }

  const syntaxDir = path.join(srcDir(), "syntax");
  const syntaxOutDir = path.join(outputDir, "syntax");
  if (!(await exists(syntaxOutDir))) {
    await fs.mkdir(syntaxOutDir);
  }

  const syntaxFiles = await readDir(syntaxDir);
  for (const fileName of syntaxFiles) {
    const filetype = fileName.endsWith(".js")
      ? "js"
      : fileName.endsWith(".mjs")
      ? "esm"
      : fileName.endsWith(".mts")
      ? "mts"
      : fileName.endsWith(".d.ts")
      ? "dts"
      : fileName.endsWith(".ts")
      ? "ts"
      : null;
    if (
      (target === "ts" && filetype !== "ts") ||
      (target === "mts" && filetype !== "mts") ||
      (target === "esm" && !(filetype === "esm" || filetype === "dts")) ||
      (target === "cjs" && !(filetype === "js" || filetype === "dts"))
    ) {
      continue;
    }
    const filePath = path.join(syntaxDir, fileName);
    let contents = await readFileUtf8(filePath);

    if (contents.indexOf(`"edgedb/dist/reflection"`) !== -1) {
      throw new Error("No directory imports allowed in `syntax` files.");
    }

    const localExt =
      filetype === "esm" ? ".mjs" : target === "mts" ? ".mjs" : "";
    const pkgExt = filetype === "esm" ? ".js" : target === "mts" ? ".js" : "";

    contents = contents
      .replace(
        /require\("(..\/)?reflection([a-zA-Z0-9\_\/]*)\.?(.*)"\)/g,
        `require("edgedb/dist/reflection$2${pkgExt}")`
      )
      .replace(/require\("@generated\/(.*)"\)/g, `require("../$1")`)
      .replace(
        /from "(..\/)?reflection([a-zA-Z0-9\_\/]*)\.?([a-z]*)"/g,
        `from "edgedb/dist/reflection$2${pkgExt}"`
      )
      .replace(/from "@generated\/(.*)";/g, `from "../$1";`);

    if (localExt) {
      contents = contents.replace(
        /from "(\.?\.\/.+)"/g,
        `from "$1${localExt}"`
      );
    }

    const outputPath = path.join(syntaxOutDir, fileName);
    await fs.writeFile(outputPath, contents);
  }

  await fs.writeFile(
    path.join(outputDir, "config.json"),
    `${configFileHeader}\n${JSON.stringify({target})}\n`
  );
}

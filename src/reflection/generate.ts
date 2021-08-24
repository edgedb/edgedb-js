import fs from "fs";
import path from "path";
import {DirBuilder} from "./builders";
import {connect} from "../index.node";

import {ConnectConfig} from "../con_utils";

import {getCasts, Casts} from "./queries/getCasts";
import {getScalars, ScalarTypes} from "./queries/getScalars";
import {FunctionTypes, getFunctions} from "./queries/getFunctions";
import {getOperators, OperatorTypes} from "./queries/getOperators";
import * as introspect from "./queries/getTypes";
import * as genutil from "./util/genutil";

import {generateCastMaps} from "./generators/generateCastMaps";
import {generateScalars} from "./generators/generateScalars";
import {generateObjectTypes} from "./generators/generateObjectTypes";
import {generateRuntimeSpec} from "./generators/generateRuntimeSpec";
import {generateFunctionTypes} from "./generators/generateFunctionTypes";
import {generateOperatorTypes} from "./generators/generateOperatorTypes";
import {generateSetImpl} from "./generators/generateSetImpl";

const DEBUG = false;

const syntaxOnly = process.argv.some((arg) => arg === "--syntaxOnly");

export type GeneratorParams = {
  dir: DirBuilder;
  types: introspect.Types;
  typesByName: Record<string, introspect.Type>;
  casts: Casts;
  scalars: ScalarTypes;
  functions: FunctionTypes;
  operators: OperatorTypes;
};

export async function generateQB(
  to: string,
  cxnConfig?: ConnectConfig
): Promise<void> {
  // tslint:disable-next-line
  console.log(`Generating query builder...`);
  if (!syntaxOnly) {
    const cxn = await connect(cxnConfig);
    const dir = new DirBuilder();

    try {
      const types = await introspect.getTypes(cxn, {debug: DEBUG});
      const scalars = await getScalars(cxn);
      const casts = await getCasts(cxn, {
        debug: DEBUG,
      });
      const functions = await getFunctions(cxn);
      const operators = await getOperators(cxn);

      const typesByName: Record<string, introspect.Type> = {};
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
        operators,
      };
      generateRuntimeSpec(generatorParams);
      generateCastMaps(generatorParams);
      generateScalars(generatorParams);
      generateObjectTypes(generatorParams);
      generateFunctionTypes(generatorParams);
      generateOperatorTypes(generatorParams);
      generateSetImpl(generatorParams);

      // generate module imports

      const importsFile = dir.getPath("imports.ts");
      importsFile.writeln(
        genutil.frag`export * as edgedb from "edgedb/src/index.node";
export {spec} from "./__spec__";
export * as syntax from "./syntax/syntax";`
      );

      /////////////////////////
      // generate index file
      /////////////////////////

      const index = dir.getPath("index.ts");
      index.addImport(`export * from "./castMaps";`);
      index.addImport(`export * from "./syntax/syntax";`);
      index.addImport(`import * as _syntax from "./syntax/syntax";`);

      index.writeln(genutil.frag`export default {`);
      index.indented(() => {
        for (const moduleName of ["std", "default"]) {
          if (dir._modules.has(moduleName)) {
            index.writeln(genutil.frag`..._${dir._modules.get(moduleName)!},`);
          }
        }
        index.writeln(genutil.frag`..._syntax,`);

        for (const [moduleName, internalName] of dir._modules) {
          if (dir.getModule(moduleName).isEmpty()) {
            continue;
          }
          index.addImport(
            `import _${internalName} from "./modules/${internalName}";`
          );

          index.writeln(
            genutil.frag`${genutil.quote(moduleName)}: _${internalName},`
          );
        }
      });

      index.writeln(genutil.frag`};`);
    } finally {
      await cxn.close();
    }

    // tslint:disable-next-line
    console.log(`Writing to disk...`);
    dir.write(to);
  }

  // write syntax files
  const syntaxDir = path.join(__dirname, "..", "syntax");
  const syntaxFiles = fs.readdirSync(syntaxDir);
  for (const fileName of syntaxFiles) {
    const filePath = path.join(syntaxDir, fileName);
    let contents = fs.readFileSync(filePath, "utf8");
    // rewrite scoped import paths
    contents = contents.replace(
      /from "(..\/)?reflection"/g,
      `from "edgedb/src/reflection"`
    );
    contents = contents.replace(/from "@generated\//g, `from "../`);
    const outputDir = path.join(to, "syntax");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    const outputFile = path.join(outputDir, fileName);
    fs.writeFileSync(outputFile, contents);
  }
}

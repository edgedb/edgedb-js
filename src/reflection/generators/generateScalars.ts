import {genutil} from "../genutil";
import {util} from "../util";
import {GeneratorParams} from "./generateCastMaps";

export const generateScalars = async (params: GeneratorParams) => {
  const {dir, types, casts} = params;
  const {castMap, implicitCastMap, assignableByMap} = casts;
  for (const type of types.values()) {
    if (type.kind !== "scalar") {
      continue;
    }

    const {mod, name} = genutil.splitName(type.name);
    const symbolName = `${name.toUpperCase()}_SYMBOL`;
    const displayName = genutil.displayName(type.name);

    const sc = dir.getPath(`modules/${mod}.ts`);
    const getScopedDisplayName = genutil.getScopedDisplayName(mod, sc);
    const baseExtends = type.bases
      .map((a) => types.get(a.id))
      .map((t) => getScopedDisplayName(t.name));

    if (type.is_abstract && !["std::anyenum"].includes(type.name)) {
      sc.writeln(
        `const ${symbolName}: unique symbol = Symbol("${type.name}")`
      );

      const bases = baseExtends.join(", ");
      sc.writeln(
        `export interface ${displayName} ${bases ? `extends ${bases} ` : ""} {`
      );
      sc.indented(() => {
        sc.writeln(`[${symbolName}]: true;`);
      });
      sc.writeln(`}`);
      sc.nl();

      continue;
    }

    sc.addImport(`import {reflection as $} from "edgedb";`);

    // generate enum
    if (type.enum_values && type.enum_values.length) {
      sc.writeln(`export enum ${name}Enum {`);
      sc.indented(() => {
        for (const val of type.enum_values) {
          sc.writeln(`${genutil.toIdent(val)} = ${genutil.quote(val)},`);
        }
      });
      sc.writeln(`}`);

      const valuesArr = `[${type.enum_values
        .map((v) => `"${v}"`)
        .join(", ")}]`;
      sc.writeln(
        `export type ${name} = typeof ${name}Enum & ${getScopedDisplayName(
          "std::anyenum"
        )}<${name}Enum, "${type.name}", ${valuesArr}>;`
      );
      sc.writeln(
        `export const ${name}: ${name} = {...${name}Enum, __values: ${valuesArr}} as any;`
      );

      sc.nl();
      continue;
    }

    // generate non-enum non-abstract scalar
    let jsType = genutil.toJsScalarType(type, types, mod, sc);
    let nameType = `"${type.name}"`;
    let genericOverride = "";
    let isRuntime = true;
    let typeLines: string[] = [];

    const castableTypes = util
      .deduplicate([...util.getFromArrayMap(castMap, type.id)])
      .map((id) => types.get(id).name)
      .map(getScopedDisplayName);
    const castableTypesUnion = `${castableTypes.join(" | ")}` || "never";
    const assignableTypes = util
      .deduplicate([...util.getFromArrayMap(assignableByMap, type.id)])
      .map((id) => types.get(id).name)
      .map(getScopedDisplayName);

    const assignableTypesUnion = `${assignableTypes.join(" | ")}` || "never";
    const implicitlyCastableTypes = util
      .deduplicate([...util.getFromArrayMap(implicitCastMap, type.id)])
      .map((id) => types.get(id).name)
      .map(getScopedDisplayName);
    // const implicitlyCastableTypesArrayString = `[${implicitlyCastableTypes.join(", ")}]`;
    const implicitlyCastableTypesUnion =
      `${implicitlyCastableTypes.join(" | ")}` || "never";

    sc.writeln(`const ${symbolName}: unique symbol = Symbol("${type.name}");`);

    if (type.name === "std::anyenum") {
      jsType = "TsType";
      nameType = "Name";
      isRuntime = false;
      genericOverride = `<TsType = unknown, Name extends string = string, Values extends [string, ...string[]] = [string, ...string[]]>`;
      typeLines = [`__values: Values;`];
    }

    const bases = baseExtends.join(", ");
    sc.writeln(
      `export interface ${displayName}${genericOverride}${
        bases ? ` extends ${bases}` : ""
      }, $.Materialtype<${nameType}, ${jsType}> {`
      // ,${castableTypesUnion}, ${assignableTypesUnion}, ${implicitlyCastableTypesUnion}
    );

    sc.indented(() => {
      sc.writeln(`[${symbolName}]: true;`);
      for (const line of typeLines) {
        sc.writeln(line);
      }
    });
    sc.writeln("}");

    if (isRuntime) {
      sc.writeln(`export const ${displayName}: ${displayName} = {`);
      // sc.writeln(`  [scalarBase.ANYTYPE]: true,`);
      // sc.writeln(`  [${symbolName}]: true,`);
      // sc.writeln(
      //   `  get [scalarBase.CASTABLE](){ return ${castableTypesArrayString} },`
      // );
      // sc.writeln(
      //   `  get [scalarBase.ASSIGNABLE](){ return ${assignableTypesArrayString} },`
      // );
      // sc.writeln(
      //   `  get [scalarBase.IMPLICITCAST](){ return ${implicitlyCastableTypesArrayString} },`
      // );
      sc.writeln(`  [$.TYPENAME]: "${type.name}",`);
      sc.writeln(`} as any;`);
    }
    sc.nl();
  }
};

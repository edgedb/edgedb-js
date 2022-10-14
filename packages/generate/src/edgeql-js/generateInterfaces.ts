import {CodeBuffer, js, t} from "../builders";
import type {GeneratorParams} from "../genutil";
import {$} from "edgedb";
import {
  getRef,
  makePlainIdent,
  quote,
  splitName,
  toTSScalarType
} from "../genutil";

export type GenerateInterfacesParams = Pick<GeneratorParams, "dir" | "types">;

export const generateInterfaces = (params: GenerateInterfacesParams) => {
  const {dir, types} = params;

  const plainTypesCode = dir.getPath("interfaces");
  plainTypesCode.addImportStar("edgedb", "edgedb", {
    typeOnly: true
  });
  const plainTypeModules = new Map<
    string,
    {internalName: string; buf: CodeBuffer; types: Map<string, string>}
  >();

  const getPlainTypeModule = (
    typeName: string
  ): {
    tMod: string;
    tName: string;
    module: {
      internalName: string;
      buf: CodeBuffer;
      types: Map<string, string>;
    };
  } => {
    const {mod: tMod, name: tName} = splitName(typeName);
    if (!plainTypeModules.has(tMod)) {
      plainTypeModules.set(tMod, {
        internalName: makePlainIdent(tMod),
        buf: new CodeBuffer(),
        types: new Map()
      });
    }
    return {tMod, tName, module: plainTypeModules.get(tMod)!};
  };

  const _getTypeName =
    (mod: string) =>
    (typeName: string, withModule: boolean = false): string => {
      const {tMod, tName, module} = getPlainTypeModule(typeName);
      return (
        ((mod !== tMod || withModule) && tMod !== "default"
          ? `${module.internalName}.`
          : "") + `${makePlainIdent(tName)}`
      );
    };

  for (const type of types.values()) {
    if (type.kind === "scalar" && type.enum_values?.length) {
      // generate plain enum type
      const {mod: enumMod, name: enumName} = splitName(type.name);
      const getEnumTypeName = _getTypeName(enumMod);

      const {module} = getPlainTypeModule(type.name);
      module.types.set(enumName, getEnumTypeName(type.name, true));
      module.buf.writeln(
        [
          t`export type ${getEnumTypeName(type.name)} = ${type.enum_values
            .map(val => quote(val))
            .join(" | ")};`
        ]
        // ...type.enum_values.map(val => [t`${quote(val)}`]).join(" | "),
        // [t`}`]
      );

      // if (enumMod === "default") {
      //   module.buf.writeln(
      //     [js`const ${getEnumTypeName(type.name)} = {`],
      //     ...type.enum_values.map(val => [
      //       js`  ${makePlainIdent(val)}: ${quote(val)},`
      //     ]),
      //     [js`}`]
      //   );
      //   plainTypesCode.addExport(getEnumTypeName(type.name), {
      //     modes: ["js"]
      //   });
      // } else {
      //   module.buf.writeln(
      //     [js`"${getEnumTypeName(type.name)}": {`],
      //     ...type.enum_values.map(val => [
      //       js`  ${makePlainIdent(val)}: ${quote(val)},`
      //     ]),
      //     [js`},`]
      //   );
      // }
    }
    if (type.kind !== "object") {
      continue;
    }
    if (
      (type.union_of && type.union_of.length) ||
      (type.intersection_of && type.intersection_of.length)
    ) {
      continue;
    }

    const {mod, name} = splitName(type.name);
    const body = dir.getModule(mod);
    body.registerRef(type.name, type.id);

    /////////
    // generate plain type
    /////////

    const getTypeName = _getTypeName(mod);

    const getTSType = (pointer: $.introspect.Pointer): string => {
      const targetType = types.get(pointer.target_id);
      if (pointer.kind === "link") {
        return getTypeName(targetType.name);
      } else {
        return toTSScalarType(
          targetType as $.introspect.PrimitiveType,
          types,
          {
            getEnumRef: enumType => getTypeName(enumType.name),
            edgedbDatatypePrefix: ""
          }
        ).join("");
      }
    };

    const {module: plainTypeModule} = getPlainTypeModule(type.name);
    const pointers = type.pointers.filter(ptr => ptr.name !== "__type__");
    plainTypeModule.types.set(name, getTypeName(type.name, true));
    plainTypeModule.buf.writeln([
      t`export interface ${getTypeName(type.name)}${
        type.bases.length
          ? ` extends ${type.bases
              .map(({id}) => {
                const baseType = types.get(id);
                return getTypeName(baseType.name);
              })
              .join(", ")}`
          : ""
      } ${
        pointers.length
          ? `{\n${pointers
              .map(pointer => {
                const isOptional = pointer.card === $.Cardinality.AtMostOne;
                return `  ${quote(pointer.name)}${
                  isOptional ? "?" : ""
                }: ${getTSType(pointer)}${
                  pointer.card === $.Cardinality.Many ||
                  pointer.card === $.Cardinality.AtLeastOne
                    ? "[]"
                    : ""
                }${isOptional ? " | null" : ""};`;
              })
              .join("\n")}\n}`
          : "{}"
      }\n`
    ]);
  }

  // plain types export
  const plainTypesExportBuf = new CodeBuffer();
  for (const [moduleName, module] of plainTypeModules) {
    if (moduleName === "default") {
      plainTypesCode.writeBuf(module.buf);
    } else {
      plainTypesCode.writeln([t`export namespace ${module.internalName} {`]);
      plainTypesCode.writeln([js`const ${module.internalName} = {`]);
      plainTypesCode.indented(() => plainTypesCode.writeBuf(module.buf));
      plainTypesCode.writeln([t`}`]);
      plainTypesCode.writeln([js`}`]);
      plainTypesCode.addExport(module.internalName, {modes: ["js"]});
    }

    plainTypesExportBuf.writeln([
      t`  ${quote(moduleName)}: {\n${[...module.types.entries()]
        .map(([name, typeName]) => `    ${quote(name)}: ${typeName};`)
        .join("\n")}\n  };`
    ]);
  }
  plainTypesCode.writeln([t`export interface types {`]);
  plainTypesCode.writeBuf(plainTypesExportBuf);
  plainTypesCode.writeln([t`}`]);

  plainTypesCode.writeln([
    t`

export namespace helper {
  export type propertyKeys<T> = {
    [k in keyof T]: NonNullable<T[k]> extends object ? never : k;
  }[keyof T];

  export type linkKeys<T> = {
    [k in keyof T]: NonNullable<T[k]> extends object ? k : never;
  }[keyof T];

  export type Props<T> = Pick<T, propertyKeys<T>>;
  export type Links<T> = Pick<T, linkKeys<T>>;
}
`
  ]);
};

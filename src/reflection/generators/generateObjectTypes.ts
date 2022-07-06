import {CodeBuffer, CodeFragment, dts, r, t, ts} from "../builders";
import {Cardinality} from "../enums";
import type {GeneratorParams} from "../generate";
import * as introspect from "../queries/getTypes";
import {
  frag,
  getRef,
  joinFrags,
  makePlainIdent,
  quote,
  splitName,
  toTSScalarType,
} from "../util/genutil";

const singletonObjectTypes = new Set(["std::FreeObject"]);

export const getStringRepresentation: (
  type: introspect.Type,
  params: {
    types: introspect.Types;
    anytype?: string | CodeFragment[];
    casts?: {[key: string]: string[]};
    castSuffix?: string;
  }
) => {staticType: CodeFragment[]; runtimeType: CodeFragment[]} = (
  type,
  params
) => {
  const suffix = params.castSuffix || `λICastableTo`;
  if (type.name === "anytype") {
    return {
      staticType: frag`${params.anytype ?? `$.BaseType`}`,
      runtimeType: [],
    };
  }
  if (type.name === "anytuple") {
    return {
      staticType: [`$.AnyTupleType`],
      runtimeType: [],
    };
  }
  if (type.name === "std::anypoint") {
    return {
      staticType: frag`${params.anytype ?? getRef("std::anypoint")}`,
      runtimeType: [],
    };
  }
  if (type.name === "std::anyenum") {
    return {
      staticType: [`$.EnumType`],
      runtimeType: [],
    };
  }
  const {types, casts} = params;
  if (type.kind === "object") {
    if (type.name === "std::BaseObject") {
      return {
        staticType: ["$.ObjectType"],
        runtimeType: [getRef(type.name)],
      };
    }
    return {
      staticType: [getRef(type.name)],
      runtimeType: [getRef(type.name)],
    };
  } else if (type.kind === "scalar") {
    return {
      staticType: [getRef(type.name), casts?.[type.id]?.length ? suffix : ""],
      runtimeType: [getRef(type.name)],
    };
    // const tsType = toJsScalarType(target, types, mod, body);
  } else if (type.kind === "array") {
    return {
      staticType: frag`$.ArrayType<${
        getStringRepresentation(types.get(type.array_element_id), params)
          .staticType
      }>`,
      runtimeType: frag`$.ArrayType(${
        getStringRepresentation(types.get(type.array_element_id), params)
          .runtimeType
      })`,
    };
  } else if (type.kind === "tuple") {
    const isNamed = type.tuple_elements[0].name !== "0";
    if (isNamed) {
      const itemsStatic = joinFrags(
        type.tuple_elements.map(
          it =>
            frag`${it.name}: ${
              getStringRepresentation(types.get(it.target_id), params)
                .staticType
            }`
        ),
        ", "
      );
      const itemsRuntime = joinFrags(
        type.tuple_elements.map(
          it =>
            frag`${it.name}: ${
              getStringRepresentation(types.get(it.target_id), params)
                .runtimeType
            }`
        ),
        ", "
      );

      return {
        staticType: frag`$.NamedTupleType<{${itemsStatic}}>`,
        runtimeType: frag`$.NamedTupleType({${itemsRuntime}})`,
      };
    } else {
      const items = type.tuple_elements
        .map(it => it.target_id)
        .map(id => types.get(id))
        .map(el => getStringRepresentation(el, params));

      return {
        staticType: frag`$.TupleType<[${joinFrags(
          items.map(it => it.staticType),
          ", "
        )}]>`,
        runtimeType: frag`$.TupleType([${joinFrags(
          items.map(it => it.runtimeType),
          ", "
        )}])`,
      };
    }
  } else if (type.kind === "range") {
    return {
      staticType: frag`$.RangeType<${
        getStringRepresentation(types.get(type.range_element_id), params)
          .staticType
      }>`,
      runtimeType: frag`$.RangeType(${
        getStringRepresentation(types.get(type.range_element_id), params)
          .runtimeType
      })`,
    };
  } else {
    throw new Error("Invalid type");
  }
};

export const generateObjectTypes = (params: GeneratorParams) => {
  const {dir, types} = params;

  const plainTypesCode = dir.getPath("types");
  plainTypesCode.addImportStar("edgedb", "edgedb", {
    typeOnly: true,
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
        types: new Map(),
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
    if (type.kind !== "object") {
      if (type.kind === "scalar" && type.enum_values?.length) {
        // generate plain enum type
        const {mod: enumMod, name: enumName} = splitName(type.name);
        const getEnumTypeName = _getTypeName(enumMod);

        const {module} = getPlainTypeModule(type.name);
        module.types.set(enumName, getEnumTypeName(type.name, true));
        module.buf.writeln(
          [t`export enum ${getEnumTypeName(type.name)} {`],
          ...type.enum_values.map(val => [
            t`  ${makePlainIdent(val)} = ${quote(val)},`,
          ]),
          [t`}`]
        );
      }
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

    const ref = getRef(type.name);

    /////////
    // generate plain type
    /////////

    const getTypeName = _getTypeName(mod);

    const getTSType = (pointer: introspect.Pointer): string => {
      const targetType = types.get(pointer.target_id);
      if (pointer.kind === "link") {
        return getTypeName(targetType.name);
      } else {
        return toTSScalarType(targetType as introspect.PrimitiveType, types, {
          getEnumRef: enumType => getTypeName(enumType.name),
          edgedbDatatypePrefix: "",
        }).join("");
      }
    };

    const {module: plainTypeModule} = getPlainTypeModule(type.name);

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
        type.pointers.length
          ? `{\n${type.pointers
              .map(pointer => {
                const isOptional =
                  pointer.real_cardinality === Cardinality.AtMostOne;
                return `  ${quote(pointer.name)}${
                  isOptional ? "?" : ""
                }: ${getTSType(pointer)}${
                  pointer.real_cardinality === Cardinality.Many ||
                  pointer.real_cardinality === Cardinality.AtLeastOne
                    ? "[]"
                    : ""
                }${isOptional ? " | null" : ""};`;
              })
              .join("\n")}\n}`
          : "{}"
      }\n`,
    ]);

    /////////
    // generate interface
    /////////

    const bases = type.bases.map(base => getRef(types.get(base.id).name));

    type Line = {
      card: string;
      staticType: CodeFragment[];
      runtimeType: CodeFragment[];
      key: string;
      isExclusive: boolean;
      is_computed: boolean;
      is_readonly: boolean;
      hasDefault: boolean;
      kind: "link" | "property";
      lines: Line[];
    };

    const ptrToLine: (ptr: introspect.Pointer | introspect.Backlink) => Line =
      ptr => {
        const card = `$.Cardinality.${ptr.real_cardinality}`;
        const target = types.get(ptr.target_id);
        const {staticType, runtimeType} = getStringRepresentation(target, {
          types,
        });

        return {
          key: ptr.name,
          staticType,
          runtimeType,
          card,
          kind: ptr.kind,
          isExclusive: ptr.is_exclusive,
          is_computed: ptr.is_computed ?? false,
          is_readonly: ptr.is_readonly ?? false,
          hasDefault: ptr.has_default ?? false,
          lines: (ptr.pointers ?? [])
            .filter(p => p.name !== "@target" && p.name !== "@source")
            .map(ptrToLine),
        };
      };

    // unique
    // const BaseObject = params.typesByName["std::BaseObject"];
    // const uniqueStubs = [...new Set(type.backlinks.map((bl) => bl.stub))];
    // const stubLines = uniqueStubs.map((stub): introspect.Pointer => {
    //   return {
    //     real_cardinality: Cardinality.Many,
    //     kind: "link",
    //     name: `<${stub}`,
    //     target_id: BaseObject.id,
    //     is_exclusive: false,
    //     pointers: null,
    //   };
    // });
    const lines = [
      ...type.pointers,
      ...type.backlinks,
      ...type.backlink_stubs,
    ].map(ptrToLine);

    // generate shape type
    const baseTypesUnion = bases.length
      ? frag`${joinFrags(bases, "λShape & ")}λShape & `
      : // ? `${bases.map((b) => `${b}λShape`).join(" & ")} & `
        ``;
    body.writeln([
      t`export `,
      dts`declare `,
      t`type ${ref}λShape = $.typeutil.flatten<${baseTypesUnion}{`,
    ]);
    body.indented(() => {
      for (const line of lines) {
        if (line.kind === "link") {
          if (!line.lines.length) {
            body.writeln([
              t`${quote(line.key)}: $.LinkDesc<${line.staticType}, ${
                line.card
              }, {}, ${line.isExclusive.toString()}, ${line.is_computed.toString()},  ${line.is_readonly.toString()}, ${line.hasDefault.toString()}>;`,
            ]);
          } else {
            body.writeln([
              t`${quote(line.key)}: $.LinkDesc<${line.staticType}, ${
                line.card
              }, {`,
            ]);
            body.indented(() => {
              for (const linkProp of line.lines) {
                body.writeln([
                  t`${quote(linkProp.key)}: $.PropertyDesc<${
                    linkProp.staticType
                  }, ${linkProp.card}>;`,
                ]);
              }
            });
            body.writeln([
              t`}, ${line.isExclusive.toString()}, ${line.is_computed.toString()}, ${line.is_readonly.toString()}, ${line.hasDefault.toString()}>;`,
            ]);
          }
        } else {
          body.writeln([
            t`${quote(line.key)}: $.PropertyDesc<${line.staticType}, ${
              line.card
            }, ${line.isExclusive.toString()}, ${line.is_computed.toString()}, ${line.is_readonly.toString()}, ${line.hasDefault.toString()}>;`,
          ]);
        }
      }
    });
    body.writeln([t`}>;`]);

    // instantiate ObjectType subtype from shape
    body.writeln([
      dts`declare `,
      t`type ${ref} = $.ObjectType<${quote(type.name)}, ${ref}λShape, null>;`,
    ]);

    if (type.name === "std::Object") {
      body.writeln([t`export `, dts`declare `, t`type $Object = ${ref}`]);
    }

    /////////
    // generate runtime type
    /////////
    const literal = getRef(type.name, {prefix: ""});

    body.writeln([
      dts`declare `,
      ...frag`const ${ref}`,
      dts`: ${ref}`,
      r` = $.makeType`,
      ts`<${ref}>`,
      r`(_.spec, ${quote(type.id)}, _.syntax.literal);`,
    ]);
    body.addExport(ref);
    // body.addExport(ref, `$${name}`); // dollar

    const typeCard = singletonObjectTypes.has(type.name) ? "One" : "Many";

    body.nl();
    body.writeln([
      dts`declare `,
      ...frag`const ${literal}`,
      // tslint:disable-next-line
      t`: $.$expr_PathNode<$.TypeSet<${ref}, $.Cardinality.${typeCard}>, null, true> `,
      r`= _.syntax.$PathNode($.$toSet(${ref}, $.Cardinality.${typeCard}), null, true);`,
    ]);
    body.nl();

    body.addExport(literal);
    body.addToDefaultExport(literal, name);
  }

  // plain types export
  const plainTypesExportBuf = new CodeBuffer();
  for (const [moduleName, module] of plainTypeModules) {
    if (moduleName === "default") {
      plainTypesCode.writeBuf(module.buf);
    } else {
      plainTypesCode.writeln([t`export namespace ${module.internalName} {`]);
      plainTypesCode.indented(() => plainTypesCode.writeBuf(module.buf));
      plainTypesCode.writeln([t`}`]);
    }

    plainTypesExportBuf.writeln([
      t`  ${quote(moduleName)}: {\n${[...module.types.entries()]
        .map(([name, typeName]) => `    ${quote(name)}: ${typeName};`)
        .join("\n")}\n  };`,
    ]);
  }
  plainTypesCode.writeln([t`export interface types {`]);
  plainTypesCode.writeBuf(plainTypesExportBuf);
  plainTypesCode.writeln([t`}`]);
};

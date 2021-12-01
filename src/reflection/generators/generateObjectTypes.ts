import {CodeFragment, dts, r, t, ts} from "../builders";
import type {GeneratorParams} from "../generate";
import * as introspect from "../queries/getTypes";
import {frag, getRef, joinFrags, quote, splitName} from "../util/genutil";

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
  } else {
    throw new Error("Invalid type");
  }
};

export const generateObjectTypes = (params: GeneratorParams) => {
  const {dir, types} = params;

  for (const type of types.values()) {
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

    const ref = getRef(type.name);

    // const {name: pathName} = splitName(type.name);
    // const typeName = displayName(type.name);

    // get bases
    // const bases: string[] = [];
    // for (const {id: baseId} of type.bases) {
    //   const baseName = getScopedDisplayName(
    //     mod,
    //     body
    //   )(types.get(baseId).name);
    //   bases.push(baseName);
    // }

    const bases = type.bases.map(base => getRef(types.get(base.id).name));

    /////////
    // generate interface
    /////////

    type Line = {
      card: string;
      staticType: CodeFragment[];
      runtimeType: CodeFragment[];
      key: string;
      isExclusive: boolean;
      writable: boolean;
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
          writable: ptr.is_writable ?? false,
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
              }, {}, ${line.isExclusive.toString()}, ${line.writable.toString()}>;`,
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
              t`}, ${line.isExclusive.toString()}, ${line.writable.toString()}>;`,
            ]);
          }
        } else {
          body.writeln([
            t`${quote(line.key)}: $.PropertyDesc<${line.staticType}, ${
              line.card
            }, ${line.isExclusive.toString()}, ${line.writable.toString()}>;`,
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
    body.addRefsDefaultExport(ref, `$${name}`);

    const typeCard = singletonObjectTypes.has(type.name) ? "One" : "Many";

    body.nl();
    body.writeln([
      dts`declare `,
      ...frag`const ${literal}`,
      // tslint:disable-next-line
      t`: $.$expr_PathNode<$.TypeSet<${ref}, $.Cardinality.${typeCard}>, null, true> `,
      r`= _.syntax.$expr_PathNode($.$toSet(${ref}, $.Cardinality.${typeCard}), null, true);`,
    ]);
    body.nl();

    body.addExport(literal);
    body.addRefsDefaultExport(literal, name);
  }
};

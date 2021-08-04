import type {GeneratorParams} from "../generate";
import {getRef, frag, joinFrags, splitName, quote} from "../util/genutil";

import * as introspect from "../queries/getTypes";
import {CodeFragment} from "../builders";

export const getStringRepresentation: (
  type: introspect.Type,
  params: {
    types: introspect.Types;
    anytype?: string | CodeFragment[];
    casts?: {[key: string]: string[]};
  }
) => {staticType: CodeFragment[]; runtimeType: CodeFragment[]} = (
  type,
  params
) => {
  if (type.name === "anytype" || type.name === "anytuple") {
    return {
      staticType: params.anytype
        ? frag`${params.anytype}`
        : [type.name === "anytuple" ? `$.AnyTupleType` : `$.MaterialType`],

      runtimeType: [],
    };
  }
  const {types, casts} = params;
  if (type.kind === "object") {
    return {
      staticType: [getRef(type.name)],
      runtimeType: [getRef(type.name)],
    };
  } else if (type.kind === "scalar") {
    return {
      staticType: [
        getRef(type.name),
        casts?.[type.id]?.length ? "λICastableTo" : "",
      ],
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
          (it) =>
            frag`${it.name}: ${
              getStringRepresentation(types.get(it.target_id), params)
                .staticType
            }`
        ),
        ", "
      );
      const itemsRuntime = joinFrags(
        type.tuple_elements.map(
          (it) =>
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
        .map((it) => it.target_id)
        .map((id) => types.get(id))
        .map((el) => getStringRepresentation(el, params));

      return {
        staticType: frag`$.TupleType<[${joinFrags(
          items.map((it) => it.staticType),
          ", "
        )}]>`,
        runtimeType: frag`$.TupleType([${joinFrags(
          items.map((it) => it.runtimeType),
          ", "
        )}])`,
      };
    }
  } else {
    throw new Error("Invalid type");
  }
};

export const generateObjectTypes = async (params: GeneratorParams) => {
  const {dir, types, casts} = params;

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

    const {name: pathName} = splitName(type.name);
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
    const bases = type.bases.map((base) => getRef(types.get(base.id).name));

    /////////
    // generate interface
    /////////

    type Line = {
      card: string;
      staticType: CodeFragment[];
      runtimeType: CodeFragment[];
      key: string;
      kind: "link" | "property";
      lines: Line[];
    };

    const ptrToLine: (ptr: introspect.Pointer) => Line = (ptr) => {
      const card = `$.Cardinality.${ptr.realCardinality}`;
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
        lines: (ptr.pointers ?? [])
          .filter((p) => p.name !== "target" && p.name !== "source")
          .map(ptrToLine),
      };
    };

    const lines = type.pointers.map(ptrToLine);

    // generate shape type
    const baseTypesUnion = bases.length
      ? frag`${joinFrags(bases, "λShape & ")}λShape & `
      : // ? `${bases.map((b) => `${b}λShape`).join(" & ")} & `
        ``;
    body.writeln(
      frag`export type ${ref}λShape = $.typeutil.flatten<${baseTypesUnion}{`
    );
    body.indented(() => {
      for (const line of lines) {
        if (line.kind === "link") {
          if (!line.lines.length) {
            body.writeln(
              frag`${quote(line.key)}: $.LinkDesc<${line.staticType}, ${
                line.card
              }, {}>;`
            );
          } else {
            body.writeln(
              frag`${quote(line.key)}: $.LinkDesc<${line.staticType}, ${
                line.card
              }, {`
            );
            body.indented(() => {
              for (const linkProp of line.lines) {
                body.writeln(
                  frag`${quote(linkProp.key)}: $.PropertyDesc<${
                    linkProp.staticType
                  }, ${linkProp.card}>;`
                );
              }
            });
            body.writeln([`}>;`]);
          }
        } else {
          body.writeln(
            frag`${quote(line.key)}: $.PropertyDesc<${line.staticType}, ${
              line.card
            }>;`
          );
        }
      }
    });
    body.writeln([`}>;`]);

    // instantiate ObjectType subtype from shape
    body.writeln(
      frag`export type ${ref} = $.ObjectType<${quote(
        type.name
      )}, ${ref}λShape, null, []>;`
    );

    /////////
    // generate runtime type
    /////////
    const literal = getRef(type.name, {
      prefix: "",
    });

    body.writeln(frag`export const ${ref} = $.makeType<${ref}>(`);
    body.indented(() => {
      body.writeln([`_.spec,`]);
      body.writeln([`${quote(type.id)},`]);
    });
    body.writeln([`);`]);
    body.nl();
    body.writeln(
      frag`export const ${literal} = _.syntax.$expr_PathNode(_.syntax.$toSet(${ref}, $.Cardinality.Many), null);`
    );
    body.nl();
    body.nl();

    body.addExport(ref, `$${name}`);
    body.addExport(literal, name);
  }
};

import {introspect} from "../../reflection";
import {CodeFragment} from "../builders";
import {FuncopDef} from "../generators/generateFunctionTypes";
import {getStringRepresentation} from "../generators/generateObjectTypes";
import {Casts} from "../queries/getCasts";
import {Param} from "../queries/getFunctions";
import {StrictMap} from "../strictMap";
import {frag, makeValidIdent, quote} from "./genutil";
import {util} from "./util";

type AnytypeDef =
  | {kind: "castable"; type: CodeFragment[]; returnAnytypeWrapper: string}
  | {
      kind: "noncastable";
      type: CodeFragment[];
      refName: string;
      refPath: string;
    };

type FuncopDefOverload<F extends FuncopDef> = F & {
  overloadIndex: number;
  params: GroupedParams;
  anytypes: AnytypeDef | null;
};

export function expandFuncopAnytypeOverloads<F extends FuncopDef>(
  overloads: F[],
  types: introspect.Types,
  casts: Casts,
  implicitCastableRootTypes: string[]
): FuncopDefOverload<F>[] {
  return util.flatMap(overloads, (funcDef, overloadIndex) => {
    const overload: FuncopDefOverload<F> = {
      ...funcDef,
      overloadIndex,
      params: groupParams(funcDef.params, types),
      anytypes: null,
    };

    // Each overload with 'anytype' params is expanded into several overloads:
    // - overload for each implicitly castable root type union
    //   and array wrapped type overload (unless some param/return type
    //   is 'array<anytype>')
    //   - param types: each is castable root type union
    //   - return anytype: getSharedParentPrimitive<...all anytype param refs>
    // - overload for object types
    //   - param types: each is 'ObjectType'
    //   - return anytype: mergeObjectTypes<...all anytype param refs>
    // - overload for anytuple
    //   - param types: each is 'AnyTuple'
    //   - return anytype: getSharedParentPrimitive<...all anytype param refs>
    // - final catch all overload (if overload only has one anytype param,
    //   only this overload generated)
    //   - param types: 1st param is 'BaseType' (or 'NonArrayType')
    //                  other params reference first param type
    //   - return anytype: references first param type

    const anytypeParams = [
      ...overload.params.positional,
      ...overload.params.named,
    ].filter(param => param.type.name.includes("anytype"));

    if (anytypeParams.length) {
      const hasArrayType =
        anytypeParams.some(param =>
          param.type.name.includes("array<anytype>")
        ) || overload.return_type.name.includes("array<anytype>");

      const catchAllOverload: FuncopDefOverload<F> = {
        ...overload,
        anytypes: {
          kind: "noncastable" as const,
          type: [hasArrayType ? "$.NonArrayType" : "$.BaseType"],
          refName: anytypeParams[0].typeName,
          refPath: findPathOfAnytype(anytypeParams[0].type.id, types),
        },
      };

      if (anytypeParams.length === 1) {
        return [catchAllOverload];
      } else {
        return [
          ...implicitCastableRootTypes.map(rootTypeId => ({
            ...overload,
            anytypes: {
              kind: "castable" as const,
              type: getStringRepresentation(types.get(rootTypeId), {
                types,
                casts: casts.implicitCastFromMap,
              }).staticType,
              returnAnytypeWrapper: "_.syntax.getSharedParentPrimitive",
            },
          })),
          ...(!hasArrayType
            ? implicitCastableRootTypes.map(rootTypeId => ({
                ...overload,
                anytypes: {
                  kind: "castable" as const,
                  type: frag`$.ArrayType<${
                    getStringRepresentation(types.get(rootTypeId), {
                      types,
                      casts: casts.implicitCastFromMap,
                    }).staticType
                  }>`,
                  returnAnytypeWrapper: "_.syntax.getSharedParentPrimitive",
                },
              }))
            : []),
          {
            ...overload,
            anytypes: {
              kind: "castable" as const,
              type: [`$.ObjectType`],
              returnAnytypeWrapper: "_.syntax.mergeObjectTypes",
            },
          },
          {
            ...overload,
            anytypes: {
              kind: "castable" as const,
              type: [`$.AnyTupleType`],
              returnAnytypeWrapper: "_.syntax.getSharedParentPrimitive",
            },
          },
          catchAllOverload,
        ];
      }
    } else {
      return [overload];
    }
  });
}

function groupParams(params: Param[], types: introspect.Types) {
  return {
    positional: params
      .filter(
        param =>
          param.kind === "PositionalParam" || param.kind === "VariadicParam"
      )
      .map((param, i) => {
        let paramType = types.get(param.type.id);
        if (param.kind === "VariadicParam") {
          if (paramType.kind !== "array") {
            throw new Error("Variadic param not array type");
          }
          paramType = types.get(paramType.array_element_id);
        }
        return {
          ...param,
          type: paramType,
          internalName: makeValidIdent({id: `${i}`, name: param.name}),
          typeName: `P${i + 1}`,
        };
      }),
    named: params
      .filter(param => param.kind === "NamedOnlyParam")
      .map(param => ({
        ...param,
        type: types.get(param.type.id),
        typeName: `NamedArgs[${quote(param.name)}]`,
      })),
  };
}

export type GroupedParams = ReturnType<typeof groupParams>;

export function findPathOfAnytype(
  typeId: string,
  types: introspect.Types
): string {
  const path = _findPathOfAnytype(typeId, types);
  if (!path) {
    throw new Error(`Cannot find 'anytype' in ${types.get(typeId).name}`);
  }
  return path;
}

function _findPathOfAnytype(
  typeId: string,
  types: introspect.Types
): string | null {
  const type = types.get(typeId);

  if (type.name === "anytype") {
    return '["__element__"]';
  }
  if (type.kind === "array") {
    const elPath = _findPathOfAnytype(type.array_element_id, types);
    if (elPath) {
      return `["__element__"]${elPath}`;
    }
  } else if (type.kind === "tuple") {
    const isNamed = type.tuple_elements[0].name !== "0";
    for (const {name, target_id} of type.tuple_elements) {
      const elPath = _findPathOfAnytype(target_id, types);
      if (elPath) {
        return `[${isNamed ? quote(name) : name}]${elPath}`;
      }
    }
  }

  return null;
}

export function sortFuncopOverloads<F extends FuncopDef>(
  overloads: F[],
  typeSpecificities: TypeSpecificities
): F[] {
  return [...overloads].sort((a, b) => {
    let i = 0;
    while (true) {
      let paramA: Param | null = a.params[i] ?? null;
      let paramB: Param | null = b.params[i] ?? null;

      if (paramA?.kind === "NamedOnlyParam") paramA = null;
      if (paramB?.kind === "NamedOnlyParam") paramB = null;

      if (paramA === null && paramB === null) return 0;
      if (paramA === null) return -1;
      if (paramB === null) return 1;

      const specA = typeSpecificities.get(paramA.type.id);
      const specB = typeSpecificities.get(paramB.type.id);

      if (specA !== specB) {
        return specA - specB;
      }

      i++;
    }
  });
}

type TypeSpecificities = StrictMap<string, number>;

export function getTypesSpecificity(types: introspect.Types, casts: Casts) {
  const typeSpecificities = new Map<introspect.Type, number>();

  let currentSpec = 0;
  let typesToVisit: introspect.Type[] = [...types.values()].filter(
    type => (casts.implicitCastFromMap[type.id] ?? []).length === 0
  );
  const nextTypesToVisit = new Set<introspect.Type>();

  while (typesToVisit.length) {
    for (const type of typesToVisit) {
      typeSpecificities.set(
        type,
        type.name === "anytype" ? Infinity : currentSpec
      );
      for (const castableTo of casts.implicitCastMap[type.id] ?? []) {
        nextTypesToVisit.add(types.get(castableTo));
      }
    }
    typesToVisit = [...nextTypesToVisit.values()];
    nextTypesToVisit.clear();
    currentSpec += 1;
  }

  const typeIdToSpecificity = new StrictMap<string, number>();
  for (const [type, spec] of typeSpecificities) {
    typeIdToSpecificity.set(type.id, spec);
  }

  return typeIdToSpecificity;
}

export function getImplicitCastableRootTypes(casts: Casts): string[] {
  return Object.entries(casts.implicitCastMap)
    .filter(([id, castableTo]) => {
      return (
        castableTo.length === 0 &&
        (casts.implicitCastFromMap[id]?.length ?? 0) > 0
      );
    })
    .map(([id]) => id);
}

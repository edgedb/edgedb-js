import {introspect} from "reflection";
import {FuncopDef} from "../generators/generateFunctionTypes";
import {Casts} from "../queries/getCasts";
import {Param} from "../queries/getFunctions";
import {StrictMap} from "../strictMap";

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
    (type) => (casts.implicitCastFromMap[type.id] ?? []).length === 0
  );
  let nextTypesToVisit = new Set<introspect.Type>();

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

export function getImplicitRootTypes(casts: Casts): string[] {
  return Object.entries(casts.implicitCastMap)
    .filter(([id, castableTo]) => {
      return (
        castableTo.length === 0 &&
        (casts.implicitCastFromMap[id]?.length ?? 0) > 0
      );
    })
    .map(([id]) => id);
}

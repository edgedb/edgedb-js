import {Executor} from "../../ifaces.ts";
import {StrictMap} from "../strictMap.ts";
import {typeutil} from "../index.ts";
import {typeMapping} from "./getTypes.ts";
import type {Version} from "../generate.ts";

export type Typemod = "SetOfType" | "OptionalType" | "SingletonType";

export type ParamKind = "VariadicParam" | "NamedOnlyParam" | "PositionalParam";

export interface Param {
  name: string;
  type: {id: string; name: string};
  kind: ParamKind;
  typemod: Typemod;
  hasDefault?: boolean;
}

export interface FunctionDef {
  id: string;
  name: string;
  description?: string;
  return_type: {id: string; name: string};
  return_typemod: Typemod;
  params: Param[];
  preserves_optionality: boolean;
}

export type FunctionTypes = typeutil.depromisify<
  ReturnType<typeof getFunctions>
>;

export const getFunctions = async (
  cxn: Executor,
  _params: {version: Version}
) => {
  const functionsJson = await cxn.queryJSON(`
    with module schema
    select Function {
      id,
      name,
      annotations: {
        name,
        @value
      } filter .name = 'std::description',
      return_type: {id, name},
      return_typemod,
      params: {
        name,
        type: {id, name},
        kind,
        typemod,
        hasDefault := exists .default,
      } order by @index,
      preserves_optionality,
    } filter .internal = false
  `);

  const functions = new StrictMap<string, FunctionDef[]>();

  const seenFuncDefHashes = new Set<string>();

  for (const func of JSON.parse(functionsJson)) {
    const {name} = func;
    if (!functions.has(name)) {
      functions.set(name, []);
    }

    const funcDef: FunctionDef = {
      ...func,
      description: func.annotations[0]?.["@value"],
    };

    replaceNumberTypes(funcDef);

    const hash = hashFuncDef(funcDef);

    if (!seenFuncDefHashes.has(hash)) {
      functions.get(name).push(funcDef);
      seenFuncDefHashes.add(hash);
    }
  }

  return functions;
};

export function replaceNumberTypes(def: {
  return_type: FunctionDef["return_type"];
  params: Param[];
}): void {
  if (typeMapping.has(def.return_type.id)) {
    const type = typeMapping.get(def.return_type.id)!;
    def.return_type = {
      id: type.id,
      name: type.name,
    };
  }

  for (const param of def.params) {
    if (typeMapping.has(param.type.id)) {
      const type = typeMapping.get(param.type.id)!;
      param.type = {
        id: type.id,
        name: type.name,
      };
    }
  }
}

function hashFuncDef(def: FunctionDef): string {
  return JSON.stringify({
    name: def.name,
    return_type: def.return_type.id,
    return_typemod: def.return_typemod,
    params: def.params
      .map(param =>
        JSON.stringify({
          kind: param.kind,
          type: param.type.id,
          typemod: param.typemod,
          hasDefault: !!param.hasDefault,
        })
      )
      .sort(),
    preserves_optionality: def.preserves_optionality,
  });
}

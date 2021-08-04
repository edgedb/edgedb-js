import {Connection} from "../../ifaces";
import {StrictMap} from "../strictMap";
import {typeutil} from "reflection";

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
}

export type FunctionTypes = typeutil.depromisify<
  ReturnType<typeof getFunctions>
>;

export const getFunctions = async (cxn: Connection) => {
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
    } filter .internal = false
  `);

  const functions = new StrictMap<string, FunctionDef[]>();

  for (const func of JSON.parse(functionsJson)) {
    const {name} = func;
    if (!functions.has(name)) {
      functions.set(name, []);
    }

    functions.get(name).push({
      ...func,
      description: func.annotations[0]?.["@value"],
    });
  }

  return functions;
};

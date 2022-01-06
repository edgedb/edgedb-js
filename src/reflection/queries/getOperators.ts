import {Executor} from "../../ifaces";
import {StrictMap} from "../strictMap";

import {Param, replaceNumberTypes, Typemod} from "./getFunctions";
import {genutil, typeutil} from "../util/util";
import {OperatorKind} from "../enums";

export type {Typemod};

export interface OperatorDef {
  id: string;
  name: string;
  originalName: string;
  operator_kind: OperatorKind;
  description?: string;
  return_type: {id: string; name: string};
  return_typemod: Typemod;
  params: Param[];
}

export type OperatorTypes = typeutil.depromisify<
  ReturnType<typeof getOperators>
>;

export const getOperators = async (cxn: Executor) => {
  const operatorsJson = await cxn.queryJSON(`
    with module schema
    select Operator {
      id,
      name,
      annotations: {
        name,
        @value
      } filter .name in {'std::identifier', 'std::description'},
      operator_kind,
      return_type: {id, name},
      return_typemod,
      params: {
        name,
        type: {id, name},
        kind,
        typemod,
      } order by @index,
    } filter not .internal and not .abstract
  `);

  const operators = new StrictMap<string, OperatorDef[]>();

  const seenOpDefHashes = new Set<string>();

  for (const op of JSON.parse(operatorsJson)) {
    const identifier = op.annotations.find(
      (anno: any) => anno.name === "std::identifier"
    )?.["@value"];

    if (!identifier) {
      continue;
    }

    const {mod} = genutil.splitName(op.name);

    const name = `${mod}::${identifier}`;

    if (!operators.has(name)) {
      operators.set(name, []);
    }

    const opDef: OperatorDef = {
      ...op,
      name,
      kind: op.operator_kind,
      originalName: op.name,
      description: op.annotations.find(
        (anno: any) => anno.name === "std::description"
      )?.["@value"],
      annotations: undefined,
    };

    replaceNumberTypes(opDef);

    const hash = hashOpDef(opDef);

    if (!seenOpDefHashes.has(hash)) {
      operators.get(name).push(opDef);
      seenOpDefHashes.add(hash);
    }
  }

  return operators;
};

function hashOpDef(def: OperatorDef): string {
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
    operator_kind: def.operator_kind,
  });
}

import {Executor} from "../../ifaces";
import {Cardinality} from "../enums";
import type {UUID} from "./queryTypes";
import {StrictMap} from "../strictMap";

export type GlobalType = {
  id: UUID;
  name: string;
  has_default: boolean;
  target_id: UUID;
  real_cardinality: Cardinality;
};

export type Globals = StrictMap<UUID, GlobalType>;

export async function getGlobals(cxn: Executor): Promise<Globals> {
  const globalsMap = new Map();
  const version = await cxn.queryRequiredSingle<number>(
    `select sys::get_version().major;`
  );
  if (version === 1) {
    return globalsMap;
  }

  const QUERY = `
    WITH
      MODULE schema
    SELECT schema::Global {
      id,
      name,
      target_id := .target.id,
      real_cardinality := ("One" IF .required ELSE "One" IF EXISTS .default ELSE "AtMostOne")
        IF <str>.cardinality = "One" ELSE
        ("AtLeastOne" IF .required ELSE "Many"),
      has_default := exists .default,
    }
    ORDER BY .name;
  `;

  const globals: GlobalType[] = JSON.parse(await cxn.queryJSON(QUERY));
  for (const g of globals) {
    globalsMap.set(g.id, g);
  }

  return globalsMap;
}

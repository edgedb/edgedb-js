import {Executor} from "../../ifaces.ts";
import {Cardinality} from "../enums.ts";
import type {Version} from "../generate.ts";
import {StrictMap} from "../strictMap.ts";

export type UUID = string;

export type GlobalType = {
  id: UUID;
  name: string;
  has_default: boolean;
  target_id: UUID;
  real_cardinality: Cardinality;
};

export type Globals = StrictMap<UUID, GlobalType>;

export async function getGlobals(
  cxn: Executor,
  params: {version: Version}
): Promise<Globals> {
  const globalsMap = new Map();
  if (params.version.major < 2) {
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

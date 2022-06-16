import {Executor} from "../../ifaces";
import {Cardinality} from "../enums";
import {StrictMap} from "../strictMap";

export type UUID = string;

export type GlobalType = {
  id: UUID;
  name: string;
  has_default: boolean;
  target_id: UUID;
  real_cardinality: Cardinality;
};

export type Globals = StrictMap<UUID, GlobalType>;

export async function getGlobals(cxn: Executor): Promise<Globals> {
  const version = await cxn.queryRequiredSingle<{
    major: number;
    minor: number;
  }>(`select sys::get_version();`);

  const globalsMap = new Map();
  if (version.major < 2) {
    return globalsMap;
  }
  const QUERY = `
    WITH
      MODULE schema
    SELECT schema::Global {
      id,
      name,
      target_id := .target.id,
      real_cardinality := ("One" IF .required ELSE "AtMostOne") IF <str>.cardinality = "One" ELSE ("AtLeastOne" IF .required ELSE "Many"),
        name,
      has_default := exists .default,
    }
    ORDER BY .name;
  `;

  const globals: GlobalType[] = JSON.parse(await cxn.queryJSON(QUERY));
  for (const g of globals) {
    globalsMap.set(g.id, g);
  }
  console.log(JSON.stringify(globals, null, 2));

  return globalsMap;
}

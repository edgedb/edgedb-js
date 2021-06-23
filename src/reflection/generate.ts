import fs from "fs";
import {CodeBuilder, DirBuilder} from "./builders";
import {connect} from "../index.node";
import {Connection} from "../ifaces";
import {StrictMap} from "./strictMap";
import {ConnectConfig} from "../con_utils";
import {getCasts} from "./queries/getCasts";
import {getScalars} from "./queries/getScalars";
import * as introspect from "./queries/getTypes";
import {genutil} from "./genutil";
import path from "path";
import {util} from "./util";
import {generateCastMaps} from "./generators/generateCastMaps";
import {generateScalars} from "./generators/generateScalars";
import {generateObjectTypes} from "./generators/generateObjectTypes";
import {generateRuntimeSpec} from "./generators/generateRuntimeSpec";

const DEBUG = true;
// get from map, defaults to empty array;

type Bigint = {name: "bigint"; castable: Bigint};
type Int64 = {name: "int64"; castable: Bigint};
type Float64 = {name: "float64"; castable: never};
type Int32 = {name: "int32"; castable: Int64 | Float64};

export async function generateQB(
  to: string,
  cxnConfig?: ConnectConfig
): Promise<void> {
  const cxn = await connect(cxnConfig);
  const dir = new DirBuilder();

  try {
    const types = await introspect.getTypes(cxn, {debug: DEBUG});
    const casts = await getCasts(cxn, {
      debug: DEBUG,
    });
    const modsIndex = new Set<string>();

    const typesByName: Record<string, introspect.Type> = {};
    for (const type of types.values()) {
      typesByName[type.name] = type;
      // skip "anytype" and "anytuple"
      if (type.name.includes("::")) {
        const {mod} = genutil.splitName(type.name);
        modsIndex.add(mod);
      }
    }

    const generatorParams = {dir, types, typesByName, casts};
    await generateCastMaps(generatorParams);
    await generateScalars(generatorParams);
    await generateObjectTypes(generatorParams);
    await generateRuntimeSpec(generatorParams);

    /////////////////////////
    // generate index file
    /////////////////////////

    const index = dir.getPath("index.ts");
    for (const mod of Array.from(modsIndex).sort()) {
      if (dir.getPath(`modules/${mod}.ts`).isEmpty()) {
        continue;
      }
      index.addImport(`export * as ${mod} from "./modules/${mod}";`);
    }
  } finally {
    await cxn.close();
  }

  console.log(`writing to disk.`);
  dir.write(to);
}

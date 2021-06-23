import {DirBuilder} from "./builders";
import {connect} from "../index.node";

import {ConnectConfig} from "../con_utils";
import {getCasts} from "./queries/getCasts";
import {getScalars} from "./queries/getScalars";
import * as introspect from "./queries/getTypes";
import {genutil} from "./genutil";
import {generateCastMaps} from "./generators/generateCastMaps";
import {generateScalars} from "./generators/generateScalars";
import {generateObjectTypes} from "./generators/generateObjectTypes";
import {generateRuntimeSpec} from "./generators/generateRuntimeSpec";

const DEBUG = true;

export async function generateQB(
  to: string,
  cxnConfig?: ConnectConfig
): Promise<void> {
  const cxn = await connect(cxnConfig);
  const dir = new DirBuilder();

  try {
    const types = await introspect.getTypes(cxn, {debug: DEBUG});
    const scalars = await getScalars(cxn);
    const casts = await getCasts(cxn, {
      debug: DEBUG,
    });
    const modsIndex = new Set<string>();

    const typesByName: Record<string, introspect.Type> = {};
    for (const type of types.values()) {
      typesByName[type.name] = type;

      // skip "anytype" and "anytuple"
      if (!type.name.includes("::")) continue;

      const {mod} = genutil.splitName(type.name);
      modsIndex.add(mod);
    }

    const generatorParams = {dir, types, typesByName, casts, scalars};
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

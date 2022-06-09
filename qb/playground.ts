// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";
// import type {objectTypeToSelectShape} from "dbschema/edgeql-js/syntax/select";

async function run() {
  const {client, data} = await setupTests();
  // type asdf = objectTypeToSelectShape<typeof e["Movie"]["__element__"]>;

  // const group = e.select({outer: e.select({inner: e.str("asdf")})});
  // const query = e.select(group, arg => ({
  //   qwer: arg.outer.inner[0],
  //   outer: {
  //     inner: true,
  //     upper: e.str_upper(arg.outer.inner),
  //   },
  // }));
  const query = e.params(
    {
      str: e.str,
      numArr: e.array(e.int64),
      optBool: e.optional(e.bool),
    },
    params =>
      e.select({
        str: params.str,
        nums: e.array_unpack(params.numArr),
        x: e.op("true", "if", params.optBool, "else", "false"),
      })
  );

  console.log(`\n#############\n### QUERY ###\n#############`);
  console.log(query.toEdgeQL());
  const result = await query.run(client, {
    str: "asdf",
    numArr: [123, 435],
    optBool: false,
  });

  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
  console.log(JSON.stringify(result, null, 2));
}

run();
export {};

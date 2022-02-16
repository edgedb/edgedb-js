// tslint:disable:no-console
import * as edgedb from "edgedb";
import type {$Movie, Bag} from "./dbschema/edgeql-js/modules/default";
import type {pointersToSelectShape} from "./dbschema/edgeql-js/syntax/select";
import {setupTests} from "./test/setupTeardown";

import e, {orScalarLiteral} from "./dbschema/edgeql-js";
import {
  assignableBy,
  pointerToAssignmentExpression,
} from "dbschema/edgeql-js/syntax/casting";

function func<T extends string, U extends [T, ...T[]]>(arg: U) {
  return arg;
}
const reuslt = func(["asdf", "qwer"]);

async function run() {
  const {client} = await setupTests();

  type askldjf = assignableBy<typeof e["Genre"]>;

  const strings = ["asdf"];
  const query = e.insert(e.Bag, {
    stringsMulti: ["asdf"],
    stringsArr: strings,
    stringMultiArr: [strings],
  });
  // type alksdjf = pointerToAssignmentExpression<
  //   typeof e["Bag"]["__element__"]["__pointers__"]["stringsArr"]
  // >;
  const final = e.select(query, () => ({
    id: true,
    stringsMulti: true,
    stringsArr: true,
    stringMultiArr: true,
  }));
  console.log(query.toEdgeQL());
  console.log(JSON.stringify(await final.run(client), null, 2));
}

run();
export {};

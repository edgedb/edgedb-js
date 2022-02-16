// tslint:disable:no-console
import * as edgedb from "edgedb";
import type {$Movie} from "./dbschema/edgeql-js/modules/default";
import type {pointersToSelectShape} from "./dbschema/edgeql-js/syntax/select";
import {setupTests} from "./test/setupTeardown";

import e from "./dbschema/edgeql-js";

export function someFunc<A, B extends string | number>(arg: A, opt?: B) {
  return {arg, opt};
}
const result = someFunc("asdf", 1234);
result;
export type someFunc = {asdf: number};

async function run() {
  const {client} = await setupTests();
}

run();
export {};

import { $ } from "edgedb";
import * as _ from "../imports.mjs";
import type * as _std from "./std.mjs";
const $extra__globals: {  user_id: _.syntax.$expr_Global<
              "extra::user_id",
              _std.$uuid,
              $.Cardinality.AtMostOne
              >} = {  user_id: _.syntax.makeGlobal(
              "extra::user_id",
              $.makeType(_.spec, "00000000-0000-0000-0000-000000000100", _.syntax.literal),
              $.Cardinality.AtMostOne) as any};



type __defaultExports = {
  "global": typeof $extra__globals
};
const __defaultExports: __defaultExports = {
  "global": $extra__globals
};
export default __defaultExports;

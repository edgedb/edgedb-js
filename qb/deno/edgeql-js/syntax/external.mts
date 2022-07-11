import type {TypeSet, setToTsType} from "edgedb/dist/reflection/index.js";

export {literal} from "./literal.mjs";
export {} from "./path.mjs";
export {set} from "./set.mjs";
export {cast} from "./cast.mjs";
export {
  ASC,
  DESC,
  EMPTY_FIRST,
  EMPTY_LAST,
  is,
  delete,
  select,
} from "./select.mjs";
export {update} from "./update.mjs";
export {insert} from "./insert.mjs";
export {array, tuple} from "./collections.mjs";
export {} from "./funcops.mjs";
export {for} from "./for.mjs";
export {alias, with} from "./with.mjs";
export {optional, params} from "./params.mjs";
export {detached} from "./detached.mjs";
export {} from "./toEdgeQL.mjs";

export type $infer<A extends TypeSet> = setToTsType<A>;

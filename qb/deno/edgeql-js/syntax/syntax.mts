import type {TypeSet, setToTsType} from "edgedb/dist/reflection/index.js";

export * from "./literal.mjs";
export * from "./path.mjs";
export * from "./set.mjs";
export * from "./cast.mjs";
export * from "./select.mjs";
export * from "./update.mjs";
export * from "./insert.mjs";
export * from "./group.mjs";
export * from "./collections.mjs";
export * from "./funcops.mjs";
export * from "./for.mjs";
export * from "./with.mjs";
export * from "./params.mjs";
export * from "./globals.mjs";
export * from "./detached.mjs";
export * from "./toEdgeQL.mjs";
export * from "./range.mjs";

export type $infer<A extends TypeSet> = setToTsType<A>;

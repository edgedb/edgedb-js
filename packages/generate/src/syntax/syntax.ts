import type { TypeSet, setToTsType } from "./typesystem.js";

export * from "./literal.js";
export * from "./path.js";
export * from "./set.js";
export * from "./cast.js";
export * from "./select.js";
export * from "./update.js";
export * from "./insert.js";
export * from "./group.js";
export * from "./collections.js";
export * from "./funcops.js";
export * from "./for.js";
export * from "./with.js";
export * from "./params.js";
export * from "./globals.js";
export * from "./detached.js";
export * from "./toEdgeQL.js";
export * from "./range.js";

export type $infer<A extends TypeSet> = setToTsType<A>;

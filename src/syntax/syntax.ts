import {TypeSet, setToTsType} from "../reflection";

export * from "./literal";
export * from "./path";
export * from "./set";
export * from "./cast";
export * from "./select";
export * from "./collections";
export * from "./funcops";
export * from "./for";
export * from "./with";
export * from "./params";
export * from "./toEdgeQL";

export type $infer<A extends TypeSet> = setToTsType<A>;

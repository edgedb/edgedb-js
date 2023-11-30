import type {TypeSet} from "./typesystem";

export type $chainedOps<Set extends TypeSet> = {};

export const opNames = {
  scalar: {} as {[key: string]: {[key: string]: string}}
};

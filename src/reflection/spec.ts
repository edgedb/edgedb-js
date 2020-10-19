import {Link} from "../m3";
import {Cardinality} from "./model";

type TypeName = string;

type PropertySpec = {
  name: TypeName;
  cardinality: Cardinality;
};

type LinkSpec = {
  name: TypeName;
  cardinality: Cardinality;
  target: TypeName;
  properties: PropertySpec[];
};

export type TypeSpec = {
  name: TypeName;
  bases: TypeName[];
  properties: PropertySpec[];
  links: LinkSpec[];
};

type ObjectType<T> = T;

export function objectType<T extends object>(spec: TypeSpec): ObjectType<T> {
  return null as any;
}

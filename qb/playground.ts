// tslint:disable:no-console
import * as edgedb from "edgedb";
import {$Hero} from "generated/example/modules/default";
import {
  Cardinality,
  ObjectType,
  ObjectTypeShape,
  TypeKind,
  typeutil,
} from "../src/reflection";
import * as e from "./generated/example";

type kljdfsa = e.default.$Hero extends ObjectType ? true : false;
// const merged = mergeObjectTypes(e.default.$Bag, e.default.$Simple);
// console.log(Object.keys(merged.__shape__));
// Object.keys(merged.__shape__).length;
// Object.keys(merged.__shape__).includes("id");
// Object.keys(merged.__shape__).includes("__type__");
// Object.keys(merged.__shape__).includes("name");

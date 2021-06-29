// tslint:disable:no-console
import * as edgedb from "edgedb";
import {$Hero} from "generated/example/modules/default";
import {
  mergeObjectTypes,
  ObjectType,
  ObjectTypeShape,
} from "../src/reflection";
import * as e from "./generated/example";

type kljdfsa = e.default.$Hero extends ObjectType ? true : false;
// const merged = mergeObjectTypes(e.default.$Bag, e.default.$Simple);
// console.log(Object.keys(merged.__shape__));
// Object.keys(merged.__shape__).length;
// Object.keys(merged.__shape__).includes("id");
// Object.keys(merged.__shape__).includes("__type__");
// Object.keys(merged.__shape__).includes("name");

// const asdf = e.set(e.default.Hero);
const asdf = e.set(e.default.Hero, e.default.Villain);
console.log(asdf);

// tslint:disable:no-console
import * as edgedb from "edgedb";
import {$Hero} from "generated/example/modules/default";
import {
  Cardinality,
  mergeObjectTypes,
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

const merged = mergeObjectTypes(e.default.$Bag, e.default.$Simple);
console.log(`MERGED`);
console.log(merged.__shape__);

// const asdf = e.set(e.default.Hero);
const asdf = e.set(e.default.Hero, e.default.Villain);
console.log(asdf);

console.log(`SINGLE ITEM`);
const _f1 = e.set(e.str("asdf"));
console.log(_f1.__element__.__name__);
console.log(_f1.__cardinality__);
console.log(_f1.__element__.__kind__);

// multiple elements
console.log(`MULTIPLES`);
const _f2 = e.set(e.str("asdf"), e.str("qwer"), e.str("poiu"));
console.log(_f2.__element__.__name__);
console.log(_f2.__cardinality__);

// implicit casting
console.log(`IMPLICIT`);
const _f5 = e.set(e.int32(5), e.float32(1234.5));
console.log(_f5.__element__.__name__);
const _f6 = e.set(e.int16(5), e.bigint(BigInt(1234)));
console.log(_f6.__element__.__name__);

// nevers
console.log(`NEVER!`);
const _f3 = e.set(e.str("asdf"), e.int64(1243)).__element__;
const _t3: typeutil.assertEqual<typeof _f3, never> = true;
const _f4 = e.set(e.bool(true), e.bigint(BigInt(14))).__element__;
const _t5: typeutil.assertEqual<typeof _f4, never> = true;

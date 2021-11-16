import {
  ArrayType,
  BaseType,
  BaseTypeTuple,
  cardinalityUtil,
  LinkDesc,
  NamedTupleType,
  ObjectType,
  PropertyDesc,
  ScalarType,
  TupleType,
  TypeSet,
} from "../reflection";
import {scalarCastableFrom, scalarAssignableBy} from "@generated/castMaps";

export type anonymizeObject<T extends ObjectType> = ObjectType<
  string,
  T["__pointers__"],
  any
>;

////////////////
// ASSIGNABLE
////////////////

type assignableTuple<Items extends BaseTypeTuple> = {
  [k in keyof Items]: Items[k] extends BaseType
    ? assignableBy<Items[k]>
    : never;
} extends infer NewItems
  ? NewItems extends BaseTypeTuple
    ? NewItems
    : never
  : never;

export type assignableBy<T extends BaseType> = T extends ScalarType
  ? scalarAssignableBy<T>
  : T extends ObjectType
  ? anonymizeObject<T>
  : T extends ArrayType
  ? ArrayType<assignableBy<T["__element__"]>>
  : T extends TupleType
  ? TupleType<assignableTuple<T["__items__"]>>
  : T extends NamedTupleType
  ? NamedTupleType<
      {
        [k in keyof T["__shape__"]]: assignableBy<T["__shape__"][k]>;
      }
    >
  : never;

export type pointerToAssignmentExpression<
  Pointer extends PropertyDesc | LinkDesc
> = [Pointer] extends [PropertyDesc]
  ? {
      __element__: assignableBy<Pointer["target"]>;
      __cardinality__: cardinalityUtil.assignable<Pointer["cardinality"]>;
    }
  : [Pointer] extends [LinkDesc]
  ? TypeSet<
      ObjectType<
        // anonymize the object type
        string,
        Pointer["target"]["__pointers__"]
      >,
      cardinalityUtil.assignable<Pointer["cardinality"]>
    >
  : never;

////////////////
// CASTABLES
////////////////

type castableTuple<Items extends BaseTypeTuple> = {
  [k in keyof Items]: Items[k] extends BaseType
    ? castableFrom<Items[k]>
    : never;
} extends infer NewItems
  ? NewItems extends BaseTypeTuple
    ? NewItems
    : never
  : never;

export type castableFrom<T extends BaseType> = T extends ScalarType
  ? scalarCastableFrom<T>
  : T extends ObjectType
  ? anonymizeObject<T>
  : T extends ArrayType
  ? ArrayType<castableFrom<T["__element__"]>>
  : T extends TupleType
  ? TupleType<castableTuple<T["__items__"]>>
  : T extends NamedTupleType
  ? NamedTupleType<
      {
        [k in keyof T["__shape__"]]: castableFrom<T["__shape__"][k]>;
      }
    >
  : never;

export type pointerToCastableExpression<
  Pointer extends PropertyDesc | LinkDesc
> = [Pointer] extends [PropertyDesc]
  ? {
      __element__: castableFrom<Pointer["target"]>;
      __cardinality__: cardinalityUtil.assignable<Pointer["cardinality"]>;
    }
  : [Pointer] extends [LinkDesc]
  ? TypeSet<
      ObjectType<
        // anonymize the object type
        string,
        Pointer["target"]["__pointers__"]
      >,
      cardinalityUtil.assignable<Pointer["cardinality"]>
    >
  : never;

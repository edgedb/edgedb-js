import {scalarAssignableBy} from "@generated/castMaps";
import {
  ArrayType,
  assignableCardinality,
  BaseType,
  BaseTypeTuple,
  Expression,
  ExpressionKind,
  LinkDesc,
  NamedTupleType,
  ObjectType,
  ObjectTypeSet,
  ObjectTypeShape,
  PropertyDesc,
  ScalarType,
  TupleType,
  TypeSet,
  typeutil,
} from "../reflection";

/////////////////
/// UPDATE
/////////////////

export type anonymizeObject<T extends ObjectType> = ObjectType<
  string,
  T["__pointers__"],
  any,
  any[]
>;

export type assignableTuple<Items extends BaseTypeTuple> = {
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

export type stripBacklinks<T extends ObjectTypeShape> = {
  [k in keyof T]: k extends `<${string}` ? never : T[k];
};

export type stripNonWritables<T extends ObjectTypeShape> = {
  [k in keyof T]: [T[k]["writable"]] extends [true] ? T[k] : never;
};

export type shapeElementToAssignmentExpression<
  Element extends PropertyDesc | LinkDesc
> = [Element] extends [PropertyDesc]
  ? {
      __element__: assignableBy<Element["target"]>;
      __cardinality__: assignableCardinality<Element["cardinality"]>;
    }
  : [Element] extends [LinkDesc]
  ? TypeSet<
      ObjectType<
        // anonymize the object type
        string,
        Element["target"]["__pointers__"]
      >,
      assignableCardinality<Element["cardinality"]>
    >
  : never;

export type UpdateShape<Root extends ObjectTypeSet> = typeutil.stripNever<
  stripNonWritables<stripBacklinks<Root["__element__"]["__pointers__"]>>
> extends infer Shape
  ? Shape extends ObjectTypeShape
    ? {
        [k in keyof Shape]?: shapeElementToAssignmentExpression<
          Shape[k]
        > extends infer S
          ? S | {"+=": S} | {"-=": S}
          : never;
      }
    : never
  : never;

export type $expr_Update<
  Root extends ObjectTypeSet = ObjectTypeSet,
  Shape extends UpdateShape<Root> = any
> = Expression<{
  __kind__: ExpressionKind.Update;
  __element__: Root["__element__"];
  __cardinality__: Root["__cardinality__"];
  __expr__: Root;
  __shape__: Shape;
}>;

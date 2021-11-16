import {
  QueryableExpression,
  ExpressionKind,
  ObjectTypePointers,
  ObjectTypeSet,
  stripBacklinks,
  stripNonWritables,
  typeutil,
} from "../reflection";
import type {pointerToAssignmentExpression} from "./casting";

/////////////////
/// UPDATE
/////////////////

export type UpdateShape<Root extends ObjectTypeSet> = typeutil.stripNever<
  stripNonWritables<stripBacklinks<Root["__element__"]["__pointers__"]>>
> extends infer Shape
  ? Shape extends ObjectTypePointers
    ? {
        [k in keyof Shape]?: pointerToAssignmentExpression<
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
> = QueryableExpression<{
  __kind__: ExpressionKind.Update;
  __element__: Root["__element__"];
  __cardinality__: Root["__cardinality__"];
  __expr__: Root;
  __shape__: Shape;
}>;

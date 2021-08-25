import {
  Cardinality,
  Expression,
  ExpressionKind,
  LinkDesc,
  ObjectTypeExpression,
  ObjectTypeSet,
  ObjectTypeShape,
  PropertyDesc,
  typeutil,
} from "reflection";
import _std from "@generated/modules/std";
import {
  shapeElementToAssignmentExpression,
  stripBacklinks,
  stripNonWritables,
} from "./update";
import {$expressionify, $expr_PathNode} from "./path";

type pointerIsOptional<T extends PropertyDesc | LinkDesc> =
  T["cardinality"] extends
    | Cardinality.Many
    | Cardinality.Empty
    | Cardinality.AtMostOne
    ? true
    : false;

export type InsertShape<Root extends ObjectTypeSet> = typeutil.stripNever<
  stripNonWritables<stripBacklinks<Root["__element__"]["__pointers__"]>>
> extends infer Shape
  ? Shape extends ObjectTypeShape
    ? typeutil.addQuestionMarks<
        {
          [k in keyof Shape]:
            | shapeElementToAssignmentExpression<Shape[k]>
            | (true extends pointerIsOptional<Shape[k]> ? undefined : never);
        }
      >
    : never
  : never;

export type $expr_Insert<
  Root extends $expr_PathNode = $expr_PathNode
  // Shape extends InsertShape<Root> = any
> = Expression<{
  __kind__: ExpressionKind.Insert;
  __element__: Root["__element__"];
  __cardinality__: Cardinality.One;
  __expr__: Root;
  __shape__: InsertShape<Root>;
}>;

export function insert<Root extends $expr_PathNode>(
  root: Root,
  shape: InsertShape<Root>
): $expr_Insert<Root> {
  return $expressionify({
    __kind__: ExpressionKind.Insert,
    __element__: root.__element__,
    __cardinality__: Cardinality.One,
    __expr__: root,
    __shape__: shape,
  });
}

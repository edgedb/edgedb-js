import {
  Cardinality,
  Expression,
  ExpressionKind,
  LinkDesc,
  ObjectTypeSet,
  ObjectTypePointers,
  PropertyDesc,
  stripBacklinks,
  stripNonWritables,
  typeutil,
  $scopify,
  stripSet,
  TypeSet,
  QueryableExpression,
} from "../reflection";
import type {pointerToAssignmentExpression} from "./casting";
import {$expressionify} from "./path";
import {$queryify} from "./query";
import {$expr_PathNode} from "../reflection/path";

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
  ? Shape extends ObjectTypePointers
    ? typeutil.addQuestionMarks<
        {
          [k in keyof Shape]:
            | pointerToAssignmentExpression<Shape[k]>
            | (pointerIsOptional<Shape[k]> extends true ? undefined : never);
        }
      >
    : never
  : never;

interface UnlessConflict {
  on: TypeSet | null;
  else?: TypeSet;
}

type InsertBaseExpression<Root extends TypeSet = TypeSet> = {
  __kind__: ExpressionKind.Insert;
  __element__: Root["__element__"];
  __cardinality__: Cardinality.One;
  __expr__: stripSet<Root>;
  __shape__: any;
};
export type $expr_Insert<
  Root extends $expr_PathNode = $expr_PathNode
  // Conflict = UnlessConflict | null
  // Shape extends InsertShape<Root> = any
> = QueryableExpression<{
  __kind__: ExpressionKind.Insert;
  __element__: Root["__element__"];
  __cardinality__: Cardinality.One;
  __expr__: Root;
  __shape__: InsertShape<Root>;

  unlessConflict(): $expr_InsertUnlessConflict<
    Expression<{
      __kind__: ExpressionKind.Insert;
      __element__: Root["__element__"];
      __cardinality__: Cardinality.One;
      __expr__: Root;
      __shape__: InsertShape<Root>;
    }>,
    {on: null}
  >;
  unlessConflict<Conflict extends UnlessConflict>(
    conflictGetter: (scope: $scopify<Root["__element__"]>) => Conflict
  ): $expr_InsertUnlessConflict<
    Expression<{
      __kind__: ExpressionKind.Insert;
      __element__: Root["__element__"];
      __cardinality__: Cardinality.One;
      __expr__: Root;
      __shape__: InsertShape<Root>;
    }>,
    Conflict
  >;
}>;

export type $expr_InsertUnlessConflict<
  Root extends InsertBaseExpression = InsertBaseExpression,
  Conflict extends UnlessConflict = UnlessConflict
> = QueryableExpression<{
  __kind__: ExpressionKind.InsertUnlessConflict;
  __element__: Root["__element__"];
  __cardinality__: Cardinality.One;
  __expr__: Root;
  __conflict__: Conflict;
}>;

function unlessConflict(
  this: $expr_Insert,
  conflictGetter?: (scope: TypeSet) => UnlessConflict
) {
  const expr: any = {
    __kind__: ExpressionKind.InsertUnlessConflict,
    __element__: this.__element__,
    __cardinality__: Cardinality.One,
    __expr__: this,
    // __conflict__: Conflict;
  };

  if (!conflictGetter) {
    expr.__conflict__ = {on: null};
    return $expressionify($queryify(expr));
  } else {
    const scopedExpr = $expressionify({
      ...this.__expr__,
      __cardinality__: Cardinality.One,
    });
    expr.__conflict__ = conflictGetter(scopedExpr);
    return $expressionify($queryify(expr));
  }
}

export function $insertify(
  expr: Omit<$expr_Insert, "unlessConflict">
): $expr_Insert {
  (expr as any).unlessConflict = unlessConflict.bind(expr as any);
  return $queryify(expr) as any;
}

export function insert<Root extends $expr_PathNode>(
  root: Root,
  shape: InsertShape<Root>
): $expr_Insert<Root> {
  const expr: any = {
    __kind__: ExpressionKind.Insert,
    __element__: root.__element__,
    __cardinality__: Cardinality.One,
    __expr__: root,
    __shape__: shape,
  };
  (expr as any).unlessConflict = unlessConflict.bind(expr);
  return $expressionify($insertify(expr)) as any;
}

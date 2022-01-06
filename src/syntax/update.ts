import {
  QueryableExpression,
  ExpressionKind,
  ObjectTypePointers,
  TypeSet,
  ObjectTypeSet,
  stripBacklinks,
  stripNonWritables,
  typeutil,
  ObjectTypeExpression,
  $scopify,
} from "../reflection";
import type {pointerToAssignmentExpression} from "./casting";
import {$expressionify, $getScopedExpr} from "./path";
import {
  SelectModifiers,
  NormalisedSelectModifiers,
  ComputeSelectCardinality,
  $existingScopes,
  $handleModifiers,
} from "./select";
import {$normaliseInsertShape} from "./insert";
import {$queryify} from "./query";

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
  Set extends TypeSet = TypeSet,
  Expr extends ObjectTypeSet = ObjectTypeSet,
  Shape extends UpdateShape<Expr> = any
> = QueryableExpression<{
  __kind__: ExpressionKind.Update;
  __element__: Set["__element__"];
  __cardinality__: Set["__cardinality__"];
  __expr__: Expr;
  __shape__: Shape;
  __modifiers__: NormalisedSelectModifiers;
  __scope__: ObjectTypeExpression;
}>;

export function update<
  Expr extends ObjectTypeExpression,
  SetShape extends UpdateShape<Expr>,
  Modifiers extends Pick<SelectModifiers, "filter">
>(
  expr: Expr,
  shape: (
    scope: $scopify<Expr["__element__"]>
  ) => Readonly<{set: SetShape} & Modifiers>
): $expr_Update<
  {
    __element__: Expr["__element__"];
    __cardinality__: ComputeSelectCardinality<Expr, Modifiers>;
  },
  Expr,
  SetShape
> {
  const cleanScopedExprs = $existingScopes.size === 0;

  const scope = $getScopedExpr(expr as any, $existingScopes);

  const resolvedShape = shape(scope);

  if (cleanScopedExprs) {
    $existingScopes.clear();
  }

  const mods: any = {};
  let updateShape: any | null;
  for (const [key, val] of Object.entries(resolvedShape)) {
    if (key === "filter") {
      mods[key] = val;
    } else if (key === "set") {
      updateShape = val;
    } else {
      throw new Error(
        `Invalid update shape key '${key}', only 'filter', ` +
          `and 'set' are allowed`
      );
    }
  }

  if (!updateShape) {
    throw new Error(`Update shape must contain 'set' shape`);
  }

  const {modifiers, cardinality} = $handleModifiers(mods, expr);

  return $expressionify(
    $queryify({
      __kind__: ExpressionKind.Update,
      __element__: expr.__element__,
      __cardinality__: cardinality,
      __expr__: expr,
      __shape__: $normaliseInsertShape(expr, updateShape, true),
      __modifiers__: modifiers,
      __scope__: scope,
    })
  ) as any;
}

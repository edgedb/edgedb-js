import {
  Cardinality,
  Expression,
  ExpressionKind,
  ObjectType,
  ObjectTypeSet,
  TypeSet,
  BaseType,
  $scopify,
  makeType,
} from "../reflection";
import {$expressionify, $getScopedExpr} from "./path";
// @ts-ignore
import type {$str} from "@generated/modules/std";
import {spec} from "@generated/__spec__";
import {literal} from "./literal";

export type $expr_Group<
  Expr extends ObjectTypeSet = ObjectTypeSet,
  Grps extends Groupings = Groupings
> = Expression<{
  __element__: groupType<Expr, Grps>;
  __cardinality__: Cardinality.One;
  __groupings__: Grps;
  __kind__: ExpressionKind.Group;
  __expr__: Expr;
  __scope__: ObjectTypeSet;
}>;

const $FreeObject = makeType(
  spec,
  [...spec.values()].find(s => s.name === "std::FreeObject")!.id,
  literal
);
const FreeObject = {
  __kind__: ExpressionKind.PathNode,
  __element__: $FreeObject,
  __cardinality__: Cardinality.One,
  __parent__: null,
  __exclusive__: true,
  __scopeRoot__: null,
};
FreeObject;

// generate type for group
// FreeShape with key, grouping, elements
// grouping is a multi string
// key is a free shape with optional elements containing all keys
// elements is a set of matching elements
type groupType<
  Expr extends ObjectTypeSet,
  Grps extends Groupings
> = ObjectType<
  "std::FreeObject",
  {},
  {
    grouping: TypeSet<$str, Cardinality.Many>;
    key: Expression<{
      __element__: ObjectType<
        "std::FreeObject",
        {},
        {
          [k in keyof Grps]: Expression<{
            __element__: Grps[k]["__element__"];
            __cardinality__: Cardinality.AtMostOne;
          }>;
        }
      >;
      __cardinality__: Cardinality.One;
    }>;
    elements: Expression<{
      __element__: Expr["__element__"];
      __cardinality__: Cardinality.Many;
    }>;
  }
>;

type SingletonSet = TypeSet<BaseType, Cardinality.One | Cardinality.AtMostOne>;
type Groupings = {[k: string]: SingletonSet};
export function group<
  Expr extends ObjectTypeSet,
  Getter extends (arg: $scopify<Expr["__element__"]>) => Groupings
>(expr: Expr, getter: Getter): $expr_Group<Expr, ReturnType<Getter>> {
  const scope = $getScopedExpr(expr as any);
  const groupings = getter(scope);
  return $expressionify({
    // no need for __element__ to conform to type definition
    __element__: $FreeObject,
    __cardinality__: Cardinality.One,
    __expr__: expr,
    __groupings__: groupings,
    __kind__: ExpressionKind.Group,
    __scope__: scope,
  }) as any;
}

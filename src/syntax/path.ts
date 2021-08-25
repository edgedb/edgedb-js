import {
  cardinalityUtil,
  Cardinality,
  LinkDesc,
  PropertyDesc,
  MaterialType,
  ObjectTypeSet,
  TypeSet,
  Expression,
  ExpressionKind,
  TypeKind,
  ObjectTypeShape,
} from "reflection";

import {toEdgeQL} from "./toEdgeQL";
import _std from "@generated/modules/std";

// get the set representing the result of a path traversal
// including cardinality merging
type getChildOfObjectTypeSet<
  Root extends ObjectTypeSet,
  ChildKey extends keyof Root["__element__"]["__pointers__"]
> = TypeSet<
  Root["__element__"]["__pointers__"][ChildKey]["target"],
  cardinalityUtil.multiplyCardinalities<
    Root["__cardinality__"],
    Root["__element__"]["__pointers__"][ChildKey]["cardinality"]
  >
>;

// path parent must be object expression
export interface PathParent<Parent extends ObjectTypeSet = ObjectTypeSet> {
  type: Parent;
  linkName: string;
}

// type t1 = assert_singleλFuncExpr<
//   $expr_PathNode<ObjectTypeSet, PathParent | null, boolean>
// >;
// type t2 = assert_singleλFuncExpr<
//   Expression<ObjectTypeSet<SomeObjectType, Cardinality>>
// >;

// const arg = (arg1: t1) => {
//   return arg1;
// };
// arg("dsf" as t2);

export type $pathify<
  Root extends TypeSet,
  Parent extends PathParent | null = null
> = Root extends ObjectTypeSet
  ? ObjectTypeSet extends Root
    ? {} // Root is literally ObjectTypeSet
    : ObjectTypeShape extends Root["__element__"]["__pointers__"]
    ? {}
    : {
        // & string required to avod typeError on linkName
        [k in keyof Root["__element__"]["__pointers__"] &
          string]: Root["__element__"]["__pointers__"][k] extends PropertyDesc
          ? $expr_PathLeaf<
              getChildOfObjectTypeSet<Root, k>,
              {type: $expr_PathNode<Root, Parent>; linkName: k},
              Root["__element__"]["__pointers__"][k]["exclusive"]
            >
          : Root["__element__"]["__pointers__"][k] extends LinkDesc
          ? getChildOfObjectTypeSet<Root, k> extends ObjectTypeSet
            ? $expr_PathNode<
                getChildOfObjectTypeSet<Root, k>,
                {type: $expr_PathNode<Root, Parent>; linkName: k},
                Root["__element__"]["__pointers__"][k]["exclusive"]
              >
            : never
          : never;
      } &
        PathNodeMethods<Root>
  : unknown; // pathify does nothing on non-object types

export function $pathify<Root extends TypeSet, Parent extends PathParent>(
  _root: Root
): $pathify<Root, Parent> {
  if (_root.__element__.__kind__ !== TypeKind.object) {
    return _root as any;
  }

  const root: $expr_PathNode<ObjectTypeSet, Parent> = _root as any;

  for (const line of Object.entries(root.__element__.__pointers__)) {
    const [key, ptr] = line;
    if (ptr.__kind__ === "property") {
      Object.defineProperty(root, key, {
        get() {
          return $expr_PathLeaf(
            {
              __element__: ptr.target,
              __cardinality__: cardinalityUtil.multiplyCardinalities(
                root.__cardinality__,
                ptr.cardinality
              ),
            },
            {
              linkName: key,
              type: root,
            },
            ptr.exclusive
          );
        },
        enumerable: true,
      });
    } else {
      Object.defineProperty(root, key, {
        get: () => {
          return $expr_PathNode(
            {
              __element__: ptr.target,
              __cardinality__: cardinalityUtil.multiplyCardinalities(
                root.__cardinality__,
                ptr.cardinality
              ),
            },
            {
              linkName: key,
              type: root,
            },
            ptr.exclusive
          );
        },
        enumerable: true,
      });
    }
  }

  return root as any;
}

export type $expr_PathNode<
  Root extends ObjectTypeSet = ObjectTypeSet,
  Parent extends PathParent | null = PathParent | null,
  Exclusive extends boolean = boolean
> = Expression<{
  __element__: Root["__element__"];
  __cardinality__: Root["__cardinality__"];
  __parent__: Parent;
  __kind__: ExpressionKind.PathNode;
  __exclusive__: Exclusive;
}>;

interface PathNodeMethods<Self extends ObjectTypeSet> {
  __element__: Self["__element__"];
  __cardinality__: Self["__cardinality__"];
}

export type $expr_TypeIntersection<
  Expr extends TypeSet = TypeSet,
  Intersection extends ObjectTypeSet = ObjectTypeSet
> = Expression<{
  __element__: Intersection["__element__"];
  __cardinality__: Expr["__cardinality__"];
  __kind__: ExpressionKind.TypeIntersection;
  __expr__: Expr;
}>;

export const $expr_PathNode = <
  Root extends ObjectTypeSet,
  Parent extends PathParent | null,
  Exclusive extends boolean = boolean
>(
  root: Root,
  parent: Parent,
  exclusive: Exclusive
): $expr_PathNode<Root, Parent, Exclusive> => {
  const pathNode = $expressionify({
    __kind__: ExpressionKind.PathNode,
    __element__: root.__element__,
    __cardinality__: root.__cardinality__,
    __parent__: parent,
    __exclusive__: exclusive,
  });
  return pathNode as any;
};

export type $expr_PathLeaf<
  Root extends TypeSet = TypeSet,
  Parent extends PathParent = PathParent,
  Exclusive extends boolean = boolean
> = Expression<{
  __element__: Root["__element__"];
  __cardinality__: Root["__cardinality__"];
  __kind__: ExpressionKind.PathLeaf;
  __parent__: Parent;
  __exclusive__: Exclusive;
}>;
export const $expr_PathLeaf = <
  Root extends TypeSet,
  Parent extends PathParent,
  Exclusive extends boolean = boolean
>(
  root: Root,
  parent: Parent,
  exclusive: Exclusive
): $expr_PathLeaf<Root, Parent, Exclusive> => {
  return $expressionify({
    __kind__: ExpressionKind.PathLeaf,
    __element__: root.__element__,
    __cardinality__: root.__cardinality__,
    __parent__: parent,
    __exclusive__: exclusive,
  }) as any;
};

export type ExpressionRoot = {
  __element__: MaterialType;
  __cardinality__: Cardinality;
  __kind__: ExpressionKind;
};

function isFunc(this: any, expr: ObjectTypeSet) {
  return $expressionify({
    __kind__: ExpressionKind.TypeIntersection,
    __cardinality__: this.__cardinality__,
    __element__: expr.__element__,
    __expr__: this,
  });
}

export function $expressionify<T extends ExpressionRoot>(
  _expr: T
): Expression<T> {
  const expr: Expression = _expr as any;
  expr.$is = isFunc.bind(expr) as any;
  expr.toEdgeQL = toEdgeQL.bind(expr);
  $pathify(expr);
  expr.$assertSingle = () => _std.assert_single(expr) as any;
  return Object.freeze(expr) as any;
}

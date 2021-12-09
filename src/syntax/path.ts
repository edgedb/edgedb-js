import {
  cardinalityUtil,
  ObjectTypeSet,
  TypeSet,
  Expression,
  ExpressionKind,
  TypeKind,
  LinkDesc,
  PropertyDesc,
  Cardinality,
} from "../reflection";
import {
  PathParent,
  $expr_PathLeaf,
  $expr_PathNode,
  $pathify,
  ExpressionRoot,
} from "../reflection/path";

import {$toEdgeQL} from "./toEdgeQL";

function _$expr_PathLeaf<
  Root extends TypeSet,
  Parent extends PathParent,
  Exclusive extends boolean = boolean
>(
  root: Root,
  parent: Parent,
  exclusive: Exclusive
): $expr_PathLeaf<Root, Parent, Exclusive> {
  return $expressionify({
    __kind__: ExpressionKind.PathLeaf,
    __element__: root.__element__,
    __cardinality__: root.__cardinality__,
    __parent__: parent,
    __exclusive__: exclusive,
  }) as any;
}

function _$expr_PathNode<
  Root extends ObjectTypeSet,
  Parent extends PathParent | null,
  Exclusive extends boolean = boolean
>(
  root: Root,
  parent: Parent,
  exclusive: Exclusive
): $expr_PathNode<Root, Parent, Exclusive> {
  const pathNode = $expressionify({
    __kind__: ExpressionKind.PathNode,
    __element__: root.__element__,
    __cardinality__: root.__cardinality__,
    __parent__: parent,
    __exclusive__: exclusive,
  });
  return pathNode as any;
}

const pathCache = Symbol();

function _$pathify<Root extends TypeSet, Parent extends PathParent>(
  _root: Root
): $pathify<Root, Parent> {
  if (_root.__element__.__kind__ !== TypeKind.object) {
    return _root as any;
  }

  const root: $expr_PathNode<ObjectTypeSet, Parent> = _root as any;

  (root as any)[pathCache] = {};

  let pointers = {
    ...root.__element__.__pointers__,
  };

  if (root.__parent__) {
    const {type, linkName} = root.__parent__;
    const parentPointer = type.__element__.__pointers__[linkName];
    if (parentPointer?.__kind__ === "link") {
      pointers = {...pointers, ...parentPointer.properties};
    }
  }

  for (const [key, _ptr] of Object.entries(pointers)) {
    const ptr: LinkDesc | PropertyDesc = _ptr as any;
    if ((ptr as any).__kind__ === "property") {
      Object.defineProperty(root, key, {
        get() {
          return (
            (root as any)[pathCache][key] ??
            ((root as any)[pathCache][key] = _$expr_PathLeaf(
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
              ptr.exclusive ?? false
            ))
          );
        },
        enumerable: true,
      });
    } else {
      Object.defineProperty(root, key, {
        get: () => {
          return (
            (root as any)[pathCache][key] ??
            ((root as any)[pathCache][key] = _$expr_PathNode(
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
            ))
          );
        },
        enumerable: true,
      });
    }
  }

  return root as any;
}

function isFunc(this: any, expr: ObjectTypeSet) {
  return $expressionify({
    __kind__: ExpressionKind.TypeIntersection,
    __cardinality__: this.__cardinality__,
    __element__: {
      ...expr.__element__,
      __shape__: {id: true},
    } as any,
    __expr__: this,
  });
}

function assert_single(expr: Expression) {
  return $expressionify({
    __kind__: ExpressionKind.Function,
    __element__: expr.__element__,
    __cardinality__: cardinalityUtil.overrideUpperBound(
      expr.__cardinality__,
      "One"
    ),
    __name__: "std::assert_single",
    __args__: [expr],
    __namedargs__: {},
  }) as any;
}

export function $expressionify<T extends ExpressionRoot>(
  _expr: T
): Expression<T> {
  const expr: Expression = _expr as any;
  expr.$is = isFunc.bind(expr) as any;
  expr.toEdgeQL = $toEdgeQL.bind(expr);
  _$pathify(expr);
  expr.$assertSingle = () => assert_single(expr) as any;
  return Object.freeze(expr) as any;
}

const scopedExprCache = new WeakMap<ExpressionRoot, Expression>();

export function $getScopedExpr<T extends ExpressionRoot>(
  expr: T,
  existingScopes?: Set<Expression>
): Expression<T> {
  let scopedExpr = scopedExprCache.get(expr);
  if (!scopedExpr || existingScopes?.has(scopedExpr)) {
    const uncached = !scopedExpr;
    scopedExpr = $expressionify({
      ...expr,
      __cardinality__: Cardinality.One,
    });
    if (uncached) {
      scopedExprCache.set(expr, scopedExpr);
    }
  }
  existingScopes?.add(scopedExpr);
  return scopedExpr as any;
}

export {
  _$pathify as $pathify,
  _$expr_PathLeaf as $expr_PathLeaf,
  _$expr_PathNode as $expr_PathNode,
};

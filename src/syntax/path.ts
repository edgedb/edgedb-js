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
import {_$arrayIndexify, _$tuplePathify} from "./collections";

import {$toEdgeQL} from "./toEdgeQL";

function _$expr_PathLeaf<
  Root extends TypeSet,
  Parent extends PathParent,
  Exclusive extends boolean = boolean
>(
  root: Root,
  parent: Parent,
  exclusive: Exclusive,
  scopeRoot: TypeSet | null = null
): $expr_PathLeaf<Root, Parent, Exclusive> {
  return $expressionify({
    __kind__: ExpressionKind.PathLeaf,
    __element__: root.__element__,
    __cardinality__: root.__cardinality__,
    __parent__: parent,
    __exclusive__: exclusive,
    __scopeRoot__: scopeRoot,
  }) as any;
}

function _$expr_PathNode<
  Root extends ObjectTypeSet,
  Parent extends PathParent | null,
  Exclusive extends boolean = boolean
>(
  root: Root,
  parent: Parent,
  exclusive: Exclusive,
  scopeRoot: TypeSet | null = null
): $expr_PathNode<Root, Parent, Exclusive> {
  return $expressionify({
    __kind__: ExpressionKind.PathNode,
    __element__: root.__element__,
    __cardinality__: root.__cardinality__,
    __parent__: parent,
    __exclusive__: exclusive,
    __scopeRoot__: scopeRoot,
  }) as any;
}

const _pathCache = Symbol();
const _pointers = Symbol();

const pathifyProxyHandlers: ProxyHandler<any> = {
  get(target: any, prop: string | symbol, proxy: any) {
    const ptr = target[_pointers][prop as any] as LinkDesc | PropertyDesc;
    if (ptr) {
      return (
        target[_pathCache][prop] ??
        (target[_pathCache][prop] = (
          (ptr.__kind__ === "property"
            ? _$expr_PathLeaf
            : _$expr_PathNode) as any
        )(
          {
            __element__: ptr.target,
            __cardinality__: cardinalityUtil.multiplyCardinalities(
              target.__cardinality__,
              ptr.cardinality
            ),
          },
          {
            linkName: prop,
            type: proxy,
          },
          ptr.exclusive ?? false,
          target.__scopeRoot__ ?? (scopeRoots.has(proxy) ? proxy : null)
        ))
      );
    }
    return target[prop];
  },
};

function _$pathify<Root extends TypeSet, Parent extends PathParent>(
  _root: Root
): $pathify<Root, Parent> {
  if (_root.__element__.__kind__ !== TypeKind.object) {
    return _root as any;
  }

  const root: $expr_PathNode<ObjectTypeSet, Parent> = _root as any;

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

  (root as any)[_pointers] = pointers;
  (root as any)[_pathCache] = {};

  return new Proxy(root, pathifyProxyHandlers);
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

function unrunnableExprHandler() {
  throw new Error(
    `It is not valid to call 'run()' on this expression. ` +
      `Hint: wrap this expression in a 'select' expression to run it.`
  );
}

export function $expressionify<T extends ExpressionRoot>(
  _expr: T
): Expression<T> {
  const expr: Expression = _$pathify(
    _$arrayIndexify(_$tuplePathify(_expr))
  ) as any;

  expr.$is = isFunc.bind(expr) as any;
  expr.toEdgeQL = $toEdgeQL.bind(expr);
  expr.$assertSingle = () => assert_single(expr) as any;
  if (!(expr as any).run) {
    (expr as any).run = unrunnableExprHandler;
  }

  return Object.freeze(expr) as any;
}

const scopedExprCache = new WeakMap<ExpressionRoot, Expression>();
const scopeRoots = new WeakSet<Expression>();

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
    scopeRoots.add(scopedExpr);
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

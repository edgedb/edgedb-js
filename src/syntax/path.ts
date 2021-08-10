import {$Hero, $Person} from "@generated/modules/default";
import {
  cardinalityUtil,
  Cardinality,
  LinkDesc,
  PropertyDesc,
  MaterialType,
  ObjectTypeSet,
  TypeSet,
  ObjectTypeExpression,
  BaseExpression,
  ExpressionKind,
  TypeKind,
  ObjectTypeShape,
} from "reflection";

import {toEdgeQL} from "./toEdgeQL";

// get the set representing the result of a path traversal
// including cardinality merging
type getChildOfObjectTypeSet<
  Root extends ObjectTypeSet,
  ChildKey extends keyof Root["__element__"]["__shape__"]
> = TypeSet<
  Root["__element__"]["__shape__"][ChildKey]["target"],
  cardinalityUtil.multiplyCardinalities<
    Root["__cardinality__"],
    Root["__element__"]["__shape__"][ChildKey]["cardinality"]
  >
>;

// utlity function for creating set
export const $toSet = <Root extends MaterialType, Card extends Cardinality>(
  root: Root,
  card: Card
): TypeSet<Root, Card> => {
  return {
    __element__: root,
    __cardinality__: card,
  };
};

// path parent must be object expression
export interface PathParent<
  Parent extends ObjectTypeExpression = ObjectTypeExpression
> {
  type: Parent;
  linkName: string;
}

// type asdfasdf = $expr_PathNode<ObjectTypeSet, null>;
// type lkjl = asdfasdf['$is']
export type $pathify<
  Root extends TypeSet,
  Parent extends PathParent | null = null
> = Root extends ObjectTypeSet
  ? ObjectTypeSet extends Root
    ? PathNodeMethods<Root> // Root is literally ObjectTypeSet
    : ObjectTypeShape extends Root["__element__"]["__shape__"]
    ? PathNodeMethods<Root>
    : {
        // & string required to avod typeError on linkName
        [k in keyof Root["__element__"]["__shape__"] &
          string]: Root["__element__"]["__shape__"][k] extends PropertyDesc
          ? $expr_PathLeaf<
              getChildOfObjectTypeSet<Root, k>,
              {type: $expr_PathNode<Root, Parent>; linkName: k},
              Root["__element__"]["__shape__"][k]["exclusive"]
            >
          : Root["__element__"]["__shape__"][k] extends LinkDesc
          ? getChildOfObjectTypeSet<Root, k> extends ObjectTypeSet
            ? $expr_PathNode<
                getChildOfObjectTypeSet<Root, k>,
                {type: $expr_PathNode<Root, Parent>; linkName: k},
                Root["__element__"]["__shape__"][k]["exclusive"]
              >
            : never
          : never;
      } &
        PathNodeMethods<Root>
  : unknown; // pathify does nothing on non-object types

function isFunc(this: any, expr: ObjectTypeExpression) {
  return $pathify({
    __kind__: ExpressionKind.TypeIntersection,
    __cardinality__: this.__cardinality__,
    __element__: expr.__element__,
    toEdgeQL,
    __expr__: this,
  });
}

export function $pathify<Root extends TypeSet, Parent extends PathParent>(
  _root: Root
): $pathify<Root, Parent> {
  if (_root.__element__.__kind__ !== TypeKind.object) {
    return _root as any;
  }

  const root: $expr_PathNode<ObjectTypeSet, Parent> = _root as any;

  for (const line of Object.entries(root.__element__.__shape__)) {
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

  (root as any).$is = isFunc.bind(root);
  return root as any;
}

export type $expr_PathNode<
  Root extends ObjectTypeSet = ObjectTypeSet,
  Parent extends PathParent | null = PathParent | null,
  Exclusive extends boolean = boolean
> = BaseExpression<Root> & {
  __parent__: Parent;
  __kind__: ExpressionKind.PathNode;
  __exclusive__: Exclusive;
};

interface PathNodeMethods<Self extends TypeSet> {
  __element__: Self["__element__"];
  __cardinality__: Self["__cardinality__"];
  $is<T extends ObjectTypeExpression>(ixn: T): $expr_TypeIntersection<this, T>;
}

export type $expr_TypeIntersection<
  Expr extends TypeSet = TypeSet,
  Intersection extends ObjectTypeExpression = ObjectTypeExpression
> = BaseExpression<{
  __element__: Intersection["__element__"];
  __cardinality__: Expr["__cardinality__"];
}> & {
  __kind__: ExpressionKind.TypeIntersection;
  __expr__: Expr;
};

export const $expr_PathNode = <
  Root extends ObjectTypeSet,
  Parent extends PathParent | null,
  Exclusive extends boolean = boolean
>(
  root: Root,
  parent: Parent,
  exclusive: Exclusive
): $expr_PathNode<Root, Parent, Exclusive> => {
  const pathNode = $pathify({
    __kind__: ExpressionKind.PathNode,
    __element__: root.__element__,
    __cardinality__: root.__cardinality__,
    __parent__: parent,
    __exclusive__: exclusive,
    toEdgeQL,
  }) as any;
  return pathNode;
};

export type $expr_PathLeaf<
  Root extends TypeSet = TypeSet,
  Parent extends PathParent = PathParent,
  Exclusive extends boolean = boolean
> = BaseExpression<Root> & {
  __kind__: ExpressionKind.PathLeaf;
  __parent__: Parent;
  __exclusive__: Exclusive;
};
export const $expr_PathLeaf = <
  Root extends TypeSet,
  Parent extends PathParent,
  Exclusive extends boolean = boolean
>(
  root: Root,
  parent: PathParent | null,
  exclusive: Exclusive
): $expr_PathLeaf<Root, Parent, Exclusive> => {
  return {
    __kind__: ExpressionKind.PathLeaf,
    __element__: root.__element__,
    __cardinality__: root.__cardinality__,
    __parent__: parent,
    __exclusive__: exclusive,
    toEdgeQL,
  } as any;
};

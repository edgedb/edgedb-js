import {Cardinality, ExpressionKind} from "./enums";
import type {
  BaseType,
  Expression,
  LinkDesc,
  ObjectType,
  ObjectTypePointers,
  ObjectTypeSet,
  PropertyDesc,
  PropertyShape,
  TypeSet,
} from "./typesystem";
import {cardinalityUtil} from "./util/cardinalityUtil";

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

export type $pathify<
  Root extends TypeSet,
  Parent extends PathParent | null = null
> = Root extends ObjectTypeSet
  ? ObjectTypeSet extends Root
    ? {} // Root is literally ObjectTypeSet
    : ObjectTypePointers extends Root["__element__"]["__pointers__"]
    ? {}
    : {
        // & string required to avoid typeError on linkName
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
      } & (Parent extends PathParent
        ? // tslint:disable-next-line
          Parent["type"]["__element__"]["__pointers__"][Parent["linkName"]] extends LinkDesc
          ? pathifyLinkProps<
              // tslint:disable-next-line
              Parent["type"]["__element__"]["__pointers__"][Parent["linkName"]]["properties"],
              Root,
              Parent
            >
          : {}
        : {}) //& {
  : //   [k in keyof Root["__element__"]["__shape__"] &
    //     string]: Root["__element__"]["__shape__"][k] extends TypeSet
    //     ? $expr_PathLeaf<
    //         TypeSet<
    //           Root["__element__"]["__shape__"][k]["__element__"],
    //           cardinalityUtil.multiplyCardinalities<
    //             Root["__cardinality__"],
    //             Root["__element__"]["__shape__"][k]["__cardinality__"]
    //           >
    //         >,
    //         {type: $expr_PathNode; linkName: k},
    //         false
    //       >
    //     : unknown;
    // }
    unknown; // pathify does nothing on non-object types

type pathifyLinkProps<
  Props extends PropertyShape,
  Root extends ObjectTypeSet,
  Parent extends PathParent | null = null
> = {
  [k in keyof Props & string]: Props[k] extends PropertyDesc
    ? $expr_PathLeaf<
        TypeSet<
          Props[k]["target"],
          cardinalityUtil.multiplyCardinalities<
            Root["__cardinality__"],
            Props[k]["cardinality"]
          >
        >,
        {type: $expr_PathNode<Root, Parent>; linkName: k},
        Props[k]["exclusive"]
      >
    : never;
};

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

export type $expr_TypeIntersection<
  Expr extends TypeSet = TypeSet,
  Intersection extends ObjectType = ObjectType
> = Expression<{
  __element__: Intersection;
  __cardinality__: Expr["__cardinality__"];
  __kind__: ExpressionKind.TypeIntersection;
  __expr__: Expr;
}>;

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

export type ExpressionRoot = {
  __element__: BaseType;
  __cardinality__: Cardinality;
  __kind__: ExpressionKind;
};

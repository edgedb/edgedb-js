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
import {typeutil} from ".";
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
export interface PathParent<
  Parent extends ObjectTypeSet = ObjectTypeSet,
  L extends string = string
> {
  type: Parent;
  linkName: L;
}

export type $linkPropify<Root extends ObjectTypeSet> = Root extends {
  __parent__: PathParent<infer Parent, infer L>;
}
  ? // tslint:disable-next-line
    Parent["__element__"]["__pointers__"][L] extends LinkDesc<
      any,
      any,
      infer LinkProps,
      any,
      any,
      any,
      any
    >
    ? pathifyLinkProps<
        // tslint:disable-next-line
        LinkProps,
        Root,
        PathParent<Parent, L>
      >
    : {}
  : unknown;

export type $pathify<
  Root extends TypeSet
  // Parent extends PathParent | null = null
> = Root extends ObjectTypeSet
  ? ObjectTypeSet extends Root
    ? {} // Root is literally ObjectTypeSet
    : pathifyPointers<Root> & pathifyShape<Root> & $linkPropify<Root>
  : {}; // pathify does nothing on non-object types

export type pathifyPointers<
  Root extends ObjectTypeSet
  // Parent extends PathParent | null = null
> = ObjectTypePointers extends Root["__element__"]["__pointers__"]
  ? unknown
  : {
      // & string required to avoid typeError on linkName
      [k in keyof Root["__element__"]["__pointers__"] &
        string]: Root["__element__"]["__pointers__"][k] extends PropertyDesc
        ? $expr_PathLeaf<
            getChildOfObjectTypeSet<Root, k>,
            {type: anonymizeObjectTypeSet<Root>; linkName: k},
            Root["__element__"]["__pointers__"][k]["exclusive"]
          >
        : Root["__element__"]["__pointers__"][k] extends LinkDesc
        ? getChildOfObjectTypeSet<Root, k> extends ObjectTypeSet
          ? $expr_PathNode<
              getChildOfObjectTypeSet<Root, k>,
              {type: anonymizeObjectTypeSet<Root>; linkName: k},
              Root["__element__"]["__pointers__"][k]["exclusive"]
            >
          : unknown
        : unknown;
    };

type anonymizeObjectTypeSet<T extends ObjectTypeSet> = typeutil.flatten<{
  __element__: ObjectType<
    T["__element__"]["__name__"],
    T["__element__"]["__pointers__"],
    {id: true}
  >;
  __cardinality__: T["__cardinality__"];
}>;

export type pathifyShape<
  Root extends ObjectTypeSet,
  Shape extends {[k: string]: any} = Root["__element__"]["__shape__"]
> = string extends keyof Shape
  ? {}
  : {
      [k in keyof Shape & string]: Shape[k] extends ObjectTypeSet
        ? $expr_PathNode<
            TypeSet<
              Shape[k]["__element__"],
              cardinalityUtil.multiplyCardinalities<
                Root["__cardinality__"],
                Shape[k]["__cardinality__"]
              >
            >,
            {type: Root; linkName: k},
            false
          >
        : Shape[k] extends TypeSet
        ? $expr_PathLeaf<
            TypeSet<
              Shape[k]["__element__"],
              cardinalityUtil.multiplyCardinalities<
                Root["__cardinality__"],
                Shape[k]["__cardinality__"]
              >
            >,
            {type: Root; linkName: k},
            false
          >
        : // must be unknown (not never) to avoid overriding
          // a pointer with the same key
          unknown;
    };

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
    : unknown;
};

export type getPropsShape<T extends ObjectType> = typeutil.flatten<
  typeutil.stripNever<{
    [k in keyof T["__pointers__"]]: T["__pointers__"][k]["__kind__"] extends "property"
      ? true
      : never;
  }>
>;

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
  "*": getPropsShape<Root["__element__"]>;
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

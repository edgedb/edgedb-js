import {pointerCardinality} from "../util/cardinalityUtil";
import {
  Cardinality,
  LinkDesc,
  PropertyDesc,
  MaterialType,
  ObjectTypeSet,
  TypeSet,
  ObjectTypeExpression,
  ObjectType,
} from "../typesystem";
import {util} from "../util/util";
import {typeutil} from "../util/typeutil";

// path parent must be object expression
export interface PathParent<
  Parent extends ObjectTypeExpression = ObjectTypeExpression
> {
  type: Parent;
  linkName: string;
}

// used exclusively in the definition of toEdgeQL
type PathLeafOrNode<Set extends TypeSet, Parent extends PathParent> = Set & {
  __parent__: Parent;
};

// stringify function for Paths
function toEdgeQL(this: PathLeafOrNode<TypeSet, PathParent>) {
  if (!this.__parent__) {
    return this.__element__.__name__;
  } else {
    return `${this.__parent__.type.toEdgeQL()}.${
      this.__parent__.linkName
    }`.trim();
  }
}

// get the set representing the result of a path traversal
// including cardinality merging
type getChildOfObjectTypeSet<
  Root extends ObjectTypeSet,
  Child extends keyof Root["__element__"]["__shape__"]
> = TypeSet<
  Root["__element__"]["__shape__"][Child]["target"],
  pointerCardinality<
    Root["__cardinality__"],
    Root["__element__"]["__shape__"][Child]["cardinality"]
  >
>;

// leaves are Set & Expression & HasParent
type makePathLeaf<Root extends TypeSet, Parent extends PathParent> = Root & {
  toEdgeQL(): string;
} & {__parent__: Parent};

// leaves are Set & Expression & HasParent & {getters for each property/link}
export type pathify<
  Root extends TypeSet,
  Parent extends PathParent | null = null
> = Root extends ObjectTypeSet
  ? ObjectTypeSet extends Root
    ? unknown
    : {
        // & string required to avod typeError on linkName
        [k in keyof Root["__element__"]["__shape__"] &
          string]: Root["__element__"]["__shape__"][k] extends PropertyDesc
          ? makePathLeaf<
              getChildOfObjectTypeSet<Root, k>,
              {type: makePathNode<Root, Parent>; linkName: k}
            >
          : Root["__element__"]["__shape__"][k] extends LinkDesc
          ? getChildOfObjectTypeSet<Root, k> extends ObjectTypeSet
            ? makePathNode<
                getChildOfObjectTypeSet<Root, k>,
                {type: makePathNode<Root, Parent>; linkName: k}
              >
            : never
          : never;
      }
  : unknown;

export type makePathNode<
  Root extends ObjectTypeSet,
  Parent extends PathParent | null
> = Root & {
  toEdgeQL(): string;
} & {__parent__: Parent} & pathify<Root, Parent>;

// utlity function for creating set
export const toSet = <Root extends MaterialType, Card extends Cardinality>(
  root: Root,
  card: Card
): TypeSet<Root, Card> => {
  return {
    __element__: root,
    __cardinality__: card,
  };
};

export const pathify = <
  Root extends ObjectTypeSet,
  Parent extends PathParent
>(
  _root: Root
): pathify<Root, Parent> => {
  const root: makePathNode<Root, Parent> = _root as any;

  for (const line of Object.entries(root.__element__.__shape__)) {
    const [key, ptr] = line;
    if (ptr.__kind__ === "property") {
      Object.defineProperty(root, key, {
        get() {
          return makePathLeaf(
            toSet(
              ptr.target,
              pointerCardinality(root.__cardinality__, ptr.cardinality)
            ),
            {
              linkName: key,
              type: root,
            }
          );
        },
        enumerable: true,
      });
    } else {
      Object.defineProperties(root, {
        [key]: {
          get: () => {
            return makePathNode(
              toSet(
                ptr.target,
                pointerCardinality(root.__cardinality__, ptr.cardinality)
              ),
              {
                linkName: key,
                type: root,
              }
            );
          },
          enumerable: true,
        },
      });
    }
  }
  return root as any;
};

// create leaf (should only be used internally)
const makePathLeaf = <Root extends TypeSet, Parent extends PathParent>(
  _root: Root,
  parent: PathParent | null
): makePathLeaf<Root, Parent> => {
  const leaf: makePathLeaf<Root, Parent> = _root as any;
  util.defineMethod(leaf, "toEdgeQL", toEdgeQL);
  leaf.__parent__ = parent as any;
  return leaf;
};

// create non-leaf path node
export const makePathNode = <
  Root extends ObjectTypeSet,
  Parent extends PathParent
>(
  _root: Root,
  parent: PathParent | null
): makePathNode<Root, Parent> => {
  const root: any = {..._root};
  root.__parent__ = parent as any;
  util.defineMethod(root, "toEdgeQL", toEdgeQL);
  return pathify(root) as any;
};

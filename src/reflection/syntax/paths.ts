import {mergeCardinalities} from "../mergeCardinalities";
import {
  Cardinality,
  LinkDesc,
  PropertyDesc,
  AnyMaterialtype,
  ObjectSetType,
  SetType,
  ObjectExpression,
} from "../typesystem";
import {util} from "../util";

// path parent must be object expression
interface PathParent<Parent extends ObjectExpression = ObjectExpression> {
  type: Parent;
  linkName: string;
}

// used exclusively in the definition of toEdgeQL
type PathLeafOrNode<Set extends SetType, Parent extends PathParent> = Set & {
  __parent__: Parent;
};

// stringify function for Paths
function toEdgeQL(this: PathLeafOrNode<SetType, PathParent>) {
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
type getChildOfObjectSetType<
  Root extends ObjectSetType,
  Child extends keyof Root["__element__"]["__shape__"]
> = SetType<
  Root["__element__"]["__shape__"][Child]["target"],
  mergeCardinalities<
    Root["__cardinality__"],
    Root["__element__"]["__shape__"][Child]["cardinality"]
  >
>;

// leaves are Set & Expression & HasParent
type makePathLeaf<Root extends SetType, Parent extends PathParent> = Root & {
  toEdgeQL(): string;
} & {__parent__: Parent};

// leaves are Set & Expression & HasParent & {getters for each property/link}
type makePathNode<
  Root extends ObjectSetType,
  Parent extends PathParent | null
> = Root & {
  toEdgeQL(): string;
} & {__parent__: Parent} & {
    // & string required to avod typeError on linkName
    [k in keyof Root["__element__"]["__shape__"] &
      string]: Root["__element__"]["__shape__"][k] extends PropertyDesc
      ? makePathLeaf<
          getChildOfObjectSetType<Root, k>,
          {type: makePathNode<Root, Parent>; linkName: k}
        >
      : Root["__element__"]["__shape__"][k] extends LinkDesc
      ? getChildOfObjectSetType<Root, k> extends ObjectSetType
        ? makePathNode<
            getChildOfObjectSetType<Root, k>,
            {type: makePathNode<Root, Parent>; linkName: k}
          >
        : never
      : never;
  };

// utlity function for creating set
export const toSet = <Root extends AnyMaterialtype, Card extends Cardinality>(
  root: Root,
  card: Card
): SetType<Root, Card> => {
  return {
    __element__: root,
    __cardinality__: card,
  };
};

// create leaf (should only be used internally)
const makePathLeaf = <Root extends SetType, Parent extends PathParent>(
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
  Root extends ObjectSetType,
  Parent extends PathParent
>(
  _root: Root,
  parent: PathParent | null
): makePathNode<Root, Parent> => {
  const root: makePathNode<Root, Parent> = _root as any;
  root.__parent__ = parent as any;
  util.defineMethod(root, "toEdgeQL", toEdgeQL);

  for (const line of Object.entries(root.__element__.__shape__)) {
    const [key, ptr] = line;
    if (ptr.__kind__ === "property") {
      Object.defineProperty(root, key, {
        get() {
          return makePathLeaf(
            toSet(
              ptr.target,
              mergeCardinalities(root.__cardinality__, ptr.cardinality)
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
                mergeCardinalities(root.__cardinality__, ptr.cardinality)
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

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
  PropertyDesc,
  LinkDesc,
  // LinkDesc,
} from "../reflection";
import {$expressionify, $getScopedExpr} from "./path";
// @ts-ignore
import type {$FreeObjectλShape, $str} from "@generated/modules/std";
import {spec} from "@generated/__spec__";
import {literal} from "./literal";

type SingletonSet = Expression<
  TypeSet<BaseType, Cardinality.One | Cardinality.AtMostOne>
>;
type SimpleGroupElements = {[k: string]: SingletonSet};
export type NestedGroupElements = {
  [k: string]: SingletonSet | GroupingSet;
};

export type GroupingSet = {
  __kind__: "groupingset";
  __settype__: "set" | "tuple" | "rollup" | "cube";
  __elements__: NestedGroupElements;
  __exprs__: [string, SingletonSet][];
};
export function isGroupingSet(arg: any): arg is GroupingSet {
  return arg.__kind__ === "groupingset";
}

// result is partial to prevent "X is specified more than once" errors
// the return type is a lie, this function returns a grouping set
// but it pretends to return a SimpleGroupElements
// to make the static computatation of `key` easier
const makeGroupingSet =
  (prefix: string) =>
  <T extends SimpleGroupElements>(grps: T): {[k in keyof T]?: T[k]} => {
    const seenKeys = new Map<string, SingletonSet>();
    const unfiltered = Object.entries(grps as NestedGroupElements).flatMap(
      ([k, grp]) =>
        isGroupingSet(grp)
          ? grp.__exprs__
          : ([[k, grp]] as [string, SingletonSet][])
    );
    const filtered = unfiltered.filter(([k, expr]) => {
      if (!seenKeys.has(k)) {
        seenKeys.set(k, expr);
        return true;
      }

      if (expr !== seenKeys.get(k)) {
        throw new Error(
          `Cannot override pre-existing expression with key "${k}"`
        );
      }

      return false;
    });

    return {
      [`${Math.round(1000000 * Math.random())}___`]: {
        __kind__: "groupingset",
        __settype__: prefix,
        __elements__: grps,
        __exprs__: filtered,
      } as GroupingSet,
    } as any;
  };
const set = makeGroupingSet("set");
const tuple = makeGroupingSet("tuple");
const rollup = makeGroupingSet("rollup");
const cube = makeGroupingSet("cube");

const setFuncs = {set, tuple, rollup, cube};

export type $expr_Group<
  Expr extends ObjectTypeSet = ObjectTypeSet,
  Grps extends SimpleGroupElements = SimpleGroupElements
> = Expression<{
  __element__: ObjectType<
    "std::FreeObject",
    $FreeObjectλShape & {
      // adding free shape elements into __pointers__
      // because select shapes don't work on __shape__
      grouping: PropertyDesc<$str, Cardinality.Many, false, true, true, false>;
      key: LinkDesc<
        ObjectType<
          "std::FreeObject",
          {
            [k in keyof Grps]: Grps[k]["__element__"] extends ObjectType
              ? never
              : PropertyDesc<Grps[k]["__element__"], Cardinality.AtMostOne>;
          }
        >,
        Cardinality.One,
        {},
        false,
        true,
        true,
        false
      >;
      elements: LinkDesc<
        Expr["__element__"],
        Cardinality.Many,
        {},
        false,
        true,
        true,
        false
      >;
    },
    {
      // grouping: true;
      // key: {[k in keyof Grps]: true};
      // elements: {id: true};
      grouping: TypeSet<$str, Cardinality.Many>;
      key: Expression<{
        __element__: ObjectType<
          "std::FreeObject",
          $FreeObjectλShape,
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
  __cardinality__: Cardinality.Many;
  // bit of a lie, this is a GroupingSet at runtime
  __grouping__: Grps;
  __kind__: ExpressionKind.Group;
  __expr__: Expr;
  __scope__: ObjectTypeSet;
}>;

type groupFunc = <
  Expr extends ObjectTypeSet,
  Getter extends (arg: $scopify<Expr["__element__"]>) => SimpleGroupElements
>(
  expr: Expr,
  getter: Getter
) => $expr_Group<Expr, ReturnType<Getter>>;

const groupFunc: groupFunc = (expr, getter) => {
  const scope = $getScopedExpr(expr as any);
  const rawGroupings = getter(scope);
  const groupSet = tuple(rawGroupings);

  // only one key in object returned from makeGroupingSet
  const key = Object.keys(groupSet)[0];
  const grouping = groupSet[key] as any as GroupingSet;
  const keyShape: any = {};
  const keyPointers: any = {};
  const keyShapeElement: any = {};

  for (const [k, e] of grouping.__exprs__) {
    keyShape[k] = $expressionify({
      __element__: e.__element__,
      __cardinality__: Cardinality.AtMostOne,
    } as any);
    keyPointers[k] = {
      __kind__: "property",
      target: e.__element__,
      cardinality: Cardinality.AtMostOne,
      exclusive: false,
      computed: false,
      readonly: false,
      hasDefault: false,
    } as PropertyDesc;
    keyShapeElement[k] = true;
    console.log(keyPointers);
    console.log(keyShapeElement);
  }

  const $FreeObject = makeType(
    spec,
    [...spec.values()].find(s => s.name === "std::FreeObject")!.id,
    literal
  );

  const str = makeType(
    spec,
    [...spec.values()].find(s => s.name === "std::str")!.id,
    literal
  );

  return $expressionify({
    __element__: {
      ...$FreeObject,
      // __name__: "std::GroupResult",
      // __pointers__: {
      //   ...($FreeObject as any).__pointers__,
      //   __name__: "std::GroupResult",
      //   grouping: {
      //     __kind__: "property",
      //     target: str,
      //     cardinality: Cardinality.Many,
      //     exclusive: false,
      //     computed: false,
      //     readonly: false,
      //     hasDefault: false,
      //   } as PropertyDesc,
      //   key: {
      //     __kind__: "link",
      //     target: {
      //       ...$FreeObject,
      //       __name__: "std::GroupResult",
      //       __pointers__: {
      //         ...($FreeObject as any).__pointers__,
      //         ...keyPointers,
      //       },
      //       __shape__: keyShape,
      //     },
      //     properties: {},
      //     cardinality: Cardinality.One,
      //     exclusive: false,
      //     computed: false,
      //     readonly: false,
      //     hasDefault: false,
      //   } as LinkDesc,

      //   elements: {
      //     __kind__: "link",
      //     target: expr.__element__,
      //     cardinality: Cardinality.Many,
      //     properties: {},
      //     exclusive: false,
      //     computed: false,
      //     readonly: false,
      //     hasDefault: false,
      //   } as LinkDesc,
      // },
      __shape__: {
        grouping: $expressionify({
          __element__: str,
          __cardinality__: Cardinality.Many,
        } as any),
        key: $expressionify({
          __element__: {
            ...$FreeObject,
            __shape__: keyShape,
          },
          __cardinality__: Cardinality.One,
        } as any),
        elements: $expressionify({
          __element__: expr.__element__,
          __cardinality__: Cardinality.Many,
        } as any),
      },
    },

    __cardinality__: Cardinality.Many,
    __shape__: {
      grouping: true,
      key: keyShapeElement,
      elements: {id: true},
    },
    __expr__: expr,
    __grouping__: grouping,
    __kind__: ExpressionKind.Group,
    __scope__: scope,
  }) as any;
};
Object.assign(groupFunc, setFuncs);

export const group: typeof setFuncs & groupFunc = groupFunc as any;

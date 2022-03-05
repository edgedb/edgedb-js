import {
  Cardinality,
  Expression,
  ExpressionKind,
  LinkDesc,
  ObjectTypeSet,
  ObjectTypePointers,
  PropertyDesc,
  stripBacklinks,
  stripNonInsertables,
  typeutil,
  $scopify,
  stripSet,
  TypeSet,
} from "../reflection";
import type {pointerToAssignmentExpression} from "./casting";
import {$expressionify, $getScopedExpr} from "./path";
import {cast} from "./cast";
import {set} from "./set";
import {literal} from "./literal";
import {$getTypeByName} from "./literal";
import type {$expr_PathNode} from "../reflection/path";
import type {$Object} from "@generated/modules/std";

export type pointerIsOptional<T extends PropertyDesc | LinkDesc> =
  T["cardinality"] extends
    | Cardinality.Many
    | Cardinality.Empty
    | Cardinality.AtMostOne
    ? true
    : false;

export type InsertShape<Root extends ObjectTypeSet> =
  // short-circuit infinitely deep
  $expr_PathNode extends Root
    ? never
    : typeutil.stripNever<
        stripNonInsertables<
          stripBacklinks<Root["__element__"]["__pointers__"]>
        >
      > extends infer Shape
    ? Shape extends ObjectTypePointers
      ? typeutil.addQuestionMarks<{
          [k in keyof Shape]:
            | pointerToAssignmentExpression<Shape[k]>
            | (pointerIsOptional<Shape[k]> extends true
                ? undefined | null
                : never)
            | (Shape[k]["hasDefault"] extends true ? undefined : never);
        }>
      : never
    : never;

interface UnlessConflict {
  on: TypeSet | null;
  else?: TypeSet;
}

type InsertBaseExpression<Root extends TypeSet = TypeSet> = {
  __kind__: ExpressionKind.Insert;
  __element__: Root["__element__"];
  __cardinality__: Cardinality.One;
  __expr__: stripSet<Root>;
  __shape__: any;
};
export type $expr_Insert<
  Root extends $expr_PathNode = $expr_PathNode
  // Conflict = UnlessConflict | null
  // Shape extends InsertShape<Root> = any
> = Expression<{
  __kind__: ExpressionKind.Insert;
  __element__: Root["__element__"];
  __cardinality__: Cardinality.One;
  __expr__: Root;
  __shape__: InsertShape<Root>;

  unlessConflict(): $expr_InsertUnlessConflict<
    Expression<{
      __kind__: ExpressionKind.Insert;
      __element__: Root["__element__"];
      __cardinality__: Cardinality.One;
      __expr__: Root;
      __shape__: InsertShape<Root>;
    }>,
    {on: null}
  >;
  unlessConflict<Conflict extends UnlessConflict>(
    conflictGetter: (scope: $scopify<Root["__element__"]>) => Conflict
  ): $expr_InsertUnlessConflict<
    Expression<{
      __kind__: ExpressionKind.Insert;
      __element__: Root["__element__"];
      __cardinality__: Cardinality.One;
      __expr__: Root;
      __shape__: InsertShape<Root>;
    }>,
    Conflict
  >;
}>;

export type $expr_InsertUnlessConflict<
  Root extends InsertBaseExpression = InsertBaseExpression,
  Conflict extends UnlessConflict = UnlessConflict
> = Expression<{
  __kind__: ExpressionKind.InsertUnlessConflict;
  __element__: Conflict["else"] extends TypeSet
    ? Conflict["else"]["__element__"]["__name__"] extends Root["__element__"]["__name__"]
      ? Root["__element__"]
      : $Object
    : Root["__element__"];
  __cardinality__: Conflict["else"] extends TypeSet
    ? Conflict["else"]["__cardinality__"]
    : Cardinality.AtMostOne;
  __expr__: Root;
  __conflict__: Conflict;
}>;

function unlessConflict(
  this: $expr_Insert,
  conflictGetter?: (scope: TypeSet) => UnlessConflict
) {
  const expr: any = {
    __kind__: ExpressionKind.InsertUnlessConflict,
    __element__: this.__element__,
    __cardinality__: Cardinality.AtMostOne,
    __expr__: this,
    // __conflict__: Conflict;
  };

  if (!conflictGetter) {
    expr.__conflict__ = {on: null};
    return $expressionify(expr);
  } else {
    const scopedExpr = $getScopedExpr(this.__expr__);
    const conflict = conflictGetter(scopedExpr);
    expr.__conflict__ = conflict;
    if (conflict.else) {
      expr.__cardinality__ = conflict.else.__cardinality__;
      if (this.__element__.__name__ !== conflict.else.__element__.__name__) {
        expr.__element__ = $getTypeByName("std::Object");
      }
    }
    return $expressionify(expr);
  }
}

export function $insertify(
  expr: Omit<$expr_Insert, "unlessConflict">
): $expr_Insert {
  (expr as any).unlessConflict = unlessConflict.bind(expr as any);
  return expr as any;
}

export function $normaliseInsertShape(
  root: ObjectTypeSet,
  shape: {[key: string]: any},
  isUpdate: boolean = false
): {[key: string]: TypeSet | {"+=": TypeSet} | {"-=": TypeSet}} {
  const newShape: {
    [key: string]: TypeSet | {"+=": TypeSet} | {"-=": TypeSet};
  } = {};
  for (const [key, _val] of Object.entries(shape)) {
    let val = _val;
    let setModify: string | null = null;
    if (isUpdate && _val != null && typeof _val === "object") {
      const valKeys = Object.keys(_val);
      if (
        valKeys.length === 1 &&
        (valKeys[0] === "+=" || valKeys[0] === "-=")
      ) {
        val = _val[valKeys[0]];
        setModify = valKeys[0];
      }
    }
    if (val?.__kind__ || val === undefined) {
      newShape[key] = _val;
    } else {
      const pointer = root.__element__.__pointers__[key];
      if (!pointer || (pointer.__kind__ !== "property" && val !== null)) {
        throw new Error(
          `Could not find property pointer for ${
            isUpdate ? "update" : "insert"
          } shape key: '${key}'`
        );
      }
      const isMulti =
        pointer.cardinality === Cardinality.AtLeastOne ||
        pointer.cardinality === Cardinality.Many;
      const wrappedVal =
        val === null
          ? cast(pointer.target, null)
          : isMulti && Array.isArray(val)
          ? set(...val.map(v => (literal as any)(pointer.target, v)))
          : (literal as any)(pointer.target, val);
      newShape[key] = setModify
        ? ({[setModify]: wrappedVal} as any)
        : wrappedVal;
    }
  }
  return newShape;
}

export function insert<Root extends $expr_PathNode>(
  root: Root,
  shape: InsertShape<Root>
): $expr_Insert<Root> {
  const expr: any = {
    __kind__: ExpressionKind.Insert,
    __element__: root.__element__,
    __cardinality__: Cardinality.One,
    __expr__: root,
    __shape__: $normaliseInsertShape(root, shape),
  };
  (expr as any).unlessConflict = unlessConflict.bind(expr);
  return $expressionify($insertify(expr)) as any;
}

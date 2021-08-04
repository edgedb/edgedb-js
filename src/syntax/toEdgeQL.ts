import {
  ExpressionKind,
  MaterialType,
  ObjectTypeExpression,
  Poly,
  SomeObjectType,
  TypeKind,
  util,
} from "reflection";
import {Duration, LocalDate, LocalDateTime, LocalTime} from "edgedb";
import {$expr_PathLeaf, $expr_PathNode, $pathify} from "./path";
import {$expr_Literal} from "./literal";
import {$expr_Set} from "./set";
import {$expr_Cast} from "./cast";
import {$expr_SimpleSelect, $expr_ShapeSelect} from "./select";
import {$expr_Function, $expr_Operator} from "./funcops";

export type SomeExpression =
  | $expr_PathNode
  | $expr_PathLeaf
  | $expr_Literal
  | $expr_Set
  | $expr_Cast
  | $expr_SimpleSelect
  | $expr_ShapeSelect<ObjectTypeExpression, any, any>
  | $expr_Function
  | $expr_Operator;

// type expr = $expr_ShapeSelect<ObjectTypeExpression, any, any>;
// type elem = expr["__element__"];
// type p = $pathify<{
//   __element__: expr["__element__"];
//   __cardinality__: expr["__cardinality__"];
// }>;

function shapeToEdgeQL(
  _shape: object,
  polys: Poly[] = [],
  params: {depth: number} = {depth: 1}
) {
  const depth = params.depth ?? 1;
  const outerSpacing = Array(depth).join("  ");
  const innerSpacing = Array(depth + 1).join("  ");
  const lines: string[] = [];
  const addLine = (line: string) => lines.push(`${innerSpacing}${line},`);

  const shapes = [{type: null, params: _shape}, ...polys];
  const seen = new Set();
  for (const shapeObj of shapes) {
    const shape = shapeObj.params;
    const polyType = shapeObj.type?.__name__;
    const polyIntersection = polyType ? `[IS ${polyType}].` : "";
    for (const key in shape) {
      if (!shape.hasOwnProperty(key)) continue;
      if (seen.has(key)) {
        // tslint:disable-next-line
        console.warn(`Invalid: duplicate key "${key}"`);
        continue;
      }
      seen.add(key);
      const val = (shape as any)[key];
      if (val === true) {
        addLine(`${polyIntersection}${key}`);
      } else if (val.hasOwnProperty("__kind__")) {
        if (polyIntersection) {
          // tslint:disable-next-line
          console.warn(
            `Invalid: no computable fields inside polymorphic shapes.`
          );
          continue;
        }
        addLine(`${key} := (${val.toEdgeQL()})`);
      } else if (typeof val === "object") {
        const nestedPolys = polys
          .map((poly) => (poly as any)[key])
          .filter((x) => !!x);
        addLine(
          `${polyIntersection}${key}: ${shapeToEdgeQL(val, nestedPolys, {
            depth: depth + 1,
          })}`
        );
      } else {
        throw new Error("Invalid shape.");
      }
    }
  }

  return `{\n${lines.join("\n")}\n${outerSpacing}}`;
}
export function toEdgeQL(this: any) {
  const expr: SomeExpression = this;
  if (
    expr.__kind__ === ExpressionKind.PathNode ||
    expr.__kind__ === ExpressionKind.PathLeaf
  ) {
    if (!expr.__parent__) {
      return expr.__element__.__name__;
    } else {
      return `${expr.__parent__.type.toEdgeQL()}.${
        expr.__parent__.linkName
      }`.trim();
    }
  } else if (expr.__kind__ === ExpressionKind.Literal) {
    return literalToEdgeQL(expr.__element__, expr.__value__);
  } else if (expr.__kind__ === ExpressionKind.Set) {
    const exprs = expr.__exprs__;

    if (
      exprs.every((ex) => ex.__element__.__kind__ === TypeKind.object) ||
      exprs.every((ex) => ex.__element__.__kind__ !== TypeKind.object)
    ) {
      if (exprs.length === 0) return `<${expr.__element__.__name__}>{}`;
      return `{ ${exprs.map((ex) => ex.toEdgeQL()).join(", ")} }`;
    } else {
      throw new Error(
        `Invalid arguments to set constructor: ${exprs
          .map((ex) => expr.__element__.__name__)
          .join(", ")}`
      );
    }
  } else if (expr.__kind__ === ExpressionKind.Cast) {
    return `<${expr.__element__.__name__}>${expr.__expr__.toEdgeQL()}`;
  } else if (expr.__kind__ === ExpressionKind.SimpleSelect) {
    return `SELECT ${expr.__expr__.toEdgeQL()}`;
  } else if (expr.__kind__ === ExpressionKind.ShapeSelect) {
    const lines = [];
    lines.push(`SELECT ${expr.__expr__.toEdgeQL()}`);
    lines.push(
      shapeToEdgeQL(
        (expr.__element__.__params__ || {}) as object,
        expr.__element__.__polys__ || []
      )
    );
    return lines.join("\n");
  } else if (expr.__kind__ === ExpressionKind.Function) {
    const args = expr.__args__.map((arg) => (arg as any).toEdgeQL());
    for (const [key, arg] of Object.entries(expr.__namedargs__)) {
      args.push(`${key} := ${(arg as any).toEdgeQL()}`);
    }
    return `${expr.__name__}(${args.join(", ")})`;
  } else if (expr.__kind__ === ExpressionKind.Operator) {
    const operator = expr.__name__.split("::")[1];
    const args = expr.__args__;
    switch (expr.__opkind__) {
      case "Infix":
        return `(${(args[0] as any).toEdgeQL()} ${operator} ${(args[1] as any).toEdgeQL()})`;
      case "Postfix":
        return `(${(args[0] as any).toEdgeQL()} ${operator})`;
      case "Prefix":
        return `(${operator} ${(args[0] as any).toEdgeQL()})`;
      case "Ternary":
        if (operator === "IF") {
          return `(${(args[0] as any).toEdgeQL()} IF ${(args[1] as any).toEdgeQL()} ELSE ${(args[2] as any).toEdgeQL()})`;
        } else {
          throw new Error(`Unknown operator: ${operator}`);
        }
      default:
        util.assertNever(
          expr.__opkind__,
          new Error(`Unknown operator kind: ${expr.__opkind__}`)
        );
    }
  } else {
    util.assertNever(expr, new Error(`Unrecognized expression kind: ${expr}`));
  }
}

export function literalToEdgeQL(type: MaterialType, val: any): string {
  let stringRep;
  if (typeof val === "string") {
    stringRep = `'${val}'`;
  } else if (typeof val === "number") {
    stringRep = `${val.toString()}`;
  } else if (typeof val === "boolean") {
    stringRep = `${val.toString()}`;
  } else if (typeof val === "bigint") {
    stringRep = `${val.toString()}n`;
  } else if (Array.isArray(val)) {
    if (type.__kind__ === TypeKind.array) {
      stringRep = `[${val
        .map((el) => literalToEdgeQL(type.__element__ as any, el))
        .join(", ")}]`;
    } else if (type.__kind__ === TypeKind.tuple) {
      stringRep = `( ${val
        .map((el, j) => literalToEdgeQL(type.__items__[j] as any, el))
        .join(", ")} )`;
    } else {
      throw new Error(`Invalid value for type ${type.__name__}`);
    }
  } else if (val instanceof Date) {
    stringRep = `'${val.toISOString()}'`;
  } else if (val instanceof LocalDate) {
    stringRep = `'${val.toString()}'`;
  } else if (val instanceof LocalDateTime) {
    stringRep = `'${val.toString()}'`;
  } else if (val instanceof LocalTime) {
    stringRep = `'${val.toString()}'`;
  } else if (val instanceof Duration) {
    stringRep = `'${val.toString()}'`;
  } else if (typeof val === "object") {
    if (type.__kind__ === TypeKind.namedtuple) {
      stringRep = `( ${Object.entries(val).map(
        ([key, value]) =>
          `${key} := ${literalToEdgeQL(type.__shape__[key], value)}`
      )} )`;
    } else {
      throw new Error(`Invalid value for type ${type.__name__}`);
    }
  } else {
    throw new Error(`Invalid value for type ${type.__name__}`);
  }
  return `<${type.__name__}>${stringRep}`;
}

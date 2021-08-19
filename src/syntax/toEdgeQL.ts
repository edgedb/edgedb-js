import {
  Cardinality,
  ExpressionKind,
  MaterialType,
  Poly,
  SelectModifierKind,
  TypeKind,
  util,
} from "reflection";
import {
  Duration,
  LocalDate,
  LocalDateTime,
  LocalTime,
} from "edgedb/src/index.node";
import type {
  $expr_PathLeaf,
  $expr_PathNode,
  $expr_TypeIntersection,
} from "./path";
import type {$expr_Literal} from "./literal";
import type {$expr_Set} from "./set";
import type {$expr_Cast} from "./cast";
import type {
  $expr_Select,
  mod_Filter,
  mod_OrderBy,
  mod_Offset,
  mod_Limit,
} from "./select";
import type {$expr_Function, $expr_Operator} from "./funcops";
import type {$expr_For, $expr_ForVar} from "./for";
import type {$expr_Alias, $expr_With} from "./with";
import type {$expr_Param, $expr_WithParams} from "./params";

export type SomeExpression =
  | $expr_PathNode
  | $expr_PathLeaf
  | $expr_Literal
  | $expr_Set
  | $expr_Cast
  | $expr_Select
  | $expr_Function
  | $expr_Operator
  | $expr_For
  | $expr_ForVar
  | $expr_TypeIntersection
  | $expr_Alias
  | $expr_With
  | $expr_WithParams
  | $expr_Param;

type WithScopeExpr = $expr_Select | $expr_For;

function shapeToEdgeQL(
  _shape: object | null,
  polys: Poly[],
  ctx: RenderCtx,
  keysOnly = false,
  params: {depth: number} = {depth: 1}
) {
  if (_shape === null) {
    return ``;
  }
  const depth = params.depth ?? 1;
  const outerSpacing = Array(depth).join("  ");
  const innerSpacing = Array(depth + 1).join("  ");
  const lines: string[] = [];
  const addLine = (line: string) =>
    lines.push(`${keysOnly ? "" : innerSpacing}${line}`);

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
      if (keysOnly || val === true) {
        addLine(`${polyIntersection}${key}`);
      } else if (val.hasOwnProperty("__kind__")) {
        if (polyIntersection) {
          // tslint:disable-next-line
          console.warn(
            `Invalid: no computable fields inside polymorphic shapes.`
          );
          continue;
        }
        addLine(`${key} := (${renderEdgeQL(val, ctx)})`);
      } else if (typeof val === "object") {
        const nestedPolys = polys
          .map((poly) => (poly as any)[key])
          .filter((x) => !!x);
        addLine(
          `${polyIntersection}${key}: ${shapeToEdgeQL(
            val,
            nestedPolys,
            ctx,
            keysOnly,
            {
              depth: depth + 1,
            }
          )}`
        );
      } else {
        throw new Error("Invalid shape.");
      }
    }
  }
  const finalLines = lines.length === 0 ? ["id"] : lines;
  return keysOnly
    ? `{${finalLines.join(", ")}}`
    : `{\n${finalLines.join(",\n")}\n${outerSpacing}}`;
}

interface RenderCtx {
  withBlocks: Map<WithScopeExpr, Set<SomeExpression>>;
  withVars: Map<
    SomeExpression,
    {name: string; scope: WithScopeExpr; childExprs: Set<SomeExpression>}
  >;
  renderWithVar?: SomeExpression;
  forVars: Map<$expr_ForVar, string>;
}

export function toEdgeQL(this: any) {
  const walkExprCtx: WalkExprTreeCtx = {
    seen: new Map(),
    rootScope: null,
  };

  walkExprTree(this, null, walkExprCtx);

  const withBlocks = new Map<WithScopeExpr, Set<SomeExpression>>();
  const withVars = new Map<
    SomeExpression,
    {name: string; scope: WithScopeExpr; childExprs: Set<SomeExpression>}
  >();

  for (const [expr, refData] of walkExprCtx.seen) {
    if (
      withVars.has(expr) ||
      (expr.__kind__ === ExpressionKind.PathNode &&
        expr.__parent__ === null) ||
      expr.__kind__ === ExpressionKind.ForVar
    ) {
      continue;
    }

    if (
      refData.boundScope ||
      refData.refCount > 1 ||
      refData.aliases.length > 0
    ) {
      const withBlock = refData.boundScope ?? walkExprCtx.rootScope;

      if (!withBlock) {
        throw new Error(
          `Cannot extract repeated expression into 'WITH' block, ` +
            `query has no 'WITH'able expressions`
        );
      }

      if (!withBlocks.has(withBlock)) {
        withBlocks.set(withBlock, new Set());
      }

      // check all references and aliases are within this block
      const validScopes = new Set([
        withBlock,
        ...walkExprCtx.seen.get(withBlock)!.childExprs,
      ]);
      for (const scope of [
        ...refData.parentScopes,
        ...refData.aliases.flatMap((alias) => [
          ...walkExprCtx.seen.get(alias)!.parentScopes,
        ]),
      ]) {
        if (scope === null || !validScopes.has(scope)) {
          throw new Error(
            refData.boundScope
              ? `Expr or it's aliases used outside of declared 'WITH' block scope`
              : `Cannot extract repeated or aliased expression into 'WITH' block, ` +
                `expression or it's aliases appear outside root scope`
          );
        }
      }

      for (const withVar of [expr, ...refData.aliases]) {
        const withVarBoundScope = walkExprCtx.seen.get(withVar)!.boundScope;
        if (withVarBoundScope && withVarBoundScope !== refData.boundScope) {
          // withVar is an alias already explicitly bound to an inner WITH block
          continue;
        }

        const withVarName = `__withVar_${withVars.size}`;

        withBlocks.get(withBlock)!.add(withVar);
        withVars.set(withVar, {
          name: withVarName,
          scope: withBlock,
          childExprs: new Set(walkExprCtx.seen.get(withVar)!.childExprs),
        });
      }
    }
  }

  return renderEdgeQL(this, {withBlocks, withVars, forVars: new Map()});
}

function topoSortWithVars(
  vars: Set<SomeExpression>,
  ctx: RenderCtx
): SomeExpression[] {
  if (!vars.size) {
    return [];
  }

  const sorted: SomeExpression[] = [];

  const unvisited = new Set(vars);
  const visiting = new Set<SomeExpression>();

  for (const withVar of unvisited) {
    visit(withVar);
  }

  function visit(withVar: SomeExpression): void {
    if (!unvisited.has(withVar)) {
      return;
    }
    if (visiting.has(withVar)) {
      throw new Error(`'WITH' variables contain a cyclic dependency`);
    }

    visiting.add(withVar);

    for (const child of ctx.withVars.get(withVar)!.childExprs) {
      if (vars.has(child)) {
        visit(child);
      }
    }

    visiting.delete(withVar);
    unvisited.delete(withVar);

    sorted.push(withVar);
  }
  return sorted;
}

function renderEdgeQL(expr: SomeExpression, ctx: RenderCtx): string {
  if (ctx.withVars.has(expr) && ctx.renderWithVar !== expr) {
    return (
      ctx.withVars.get(expr)!.name +
      (expr.__kind__ === ExpressionKind.Select &&
      expr.__element__.__kind__ === TypeKind.object
        ? " " +
          shapeToEdgeQL(
            (expr.__element__.__params__ || {}) as object,
            expr.__element__.__polys__ || [],
            ctx,
            true
          )
        : "")
    );
  }

  let withBlock = "";
  if (ctx.withBlocks.has(expr as any)) {
    const blockVars = topoSortWithVars(ctx.withBlocks.get(expr as any)!, ctx);
    withBlock = blockVars.length
      ? `WITH\n${blockVars
          .map((varExpr) => {
            const renderedExpr = renderEdgeQL(varExpr, {
              ...ctx,
              renderWithVar: varExpr,
            });
            return `  ${ctx.withVars.get(varExpr)!.name} := (${
              renderedExpr.includes("\n")
                ? `\n${indent(renderedExpr, 4)}\n  `
                : renderedExpr
            })`;
          })
          .join(",\n")}\n`
      : "";
  }

  if (
    expr.__kind__ === ExpressionKind.With ||
    expr.__kind__ === ExpressionKind.WithParams
  ) {
    return renderEdgeQL(expr.__expr__ as any, ctx);
  } else if (expr.__kind__ === ExpressionKind.Alias) {
    const aliasedExprVar = ctx.withVars.get(expr.__expr__ as any);
    if (!aliasedExprVar) {
      throw new Error(
        `Expression referenced by alias does not exist in 'WITH' block`
      );
    }
    return aliasedExprVar.name;
  } else if (
    expr.__kind__ === ExpressionKind.PathNode ||
    expr.__kind__ === ExpressionKind.PathLeaf
  ) {
    if (!expr.__parent__) {
      return expr.__element__.__name__;
    } else {
      return `${renderEdgeQL(expr.__parent__.type as any, ctx)}.${
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
      return `{ ${exprs
        .map((ex) => renderEdgeQL(ex as any, ctx))
        .join(", ")} }`;
    } else {
      throw new Error(
        `Invalid arguments to set constructor: ${exprs
          .map((ex) => expr.__element__.__name__)
          .join(", ")}`
      );
    }
  } else if (expr.__kind__ === ExpressionKind.Cast) {
    return `<${expr.__element__.__name__}>${renderEdgeQL(
      expr.__expr__ as any,
      ctx
    )}`;
  } else if (expr.__kind__ === ExpressionKind.Select) {
    if (expr.__modifier__) {
      // if modifier exists, unwrap nested 'selects'
      // until 'select' expr has no modifier
      const mods = {
        filter: [] as mod_Filter[],
        order: [] as mod_OrderBy[],
        offsetBy: null as mod_Offset | null,
        limit: null as mod_Limit | null,
      };

      let selectExpr = expr;
      while (selectExpr.__modifier__) {
        const mod = selectExpr.__modifier__;
        switch (mod.kind) {
          case SelectModifierKind.filter:
            mods.filter.unshift(mod);
            break;
          case SelectModifierKind.order_by:
            mods.order.unshift(mod);
            break;
          case SelectModifierKind.offset:
            mods.offsetBy = mod;
            break;
          case SelectModifierKind.limit:
            mods.limit = mod;
            break;
          default:
            util.assertNever(mod, new Error(`Unknown operator kind: ${mod}`));
        }
        selectExpr = selectExpr.__expr__ as $expr_Select;
      }

      const lines = [renderEdgeQL(selectExpr as any, ctx)];
      if (mods.filter.length) {
        lines.push(
          `FILTER ${mods.filter
            .map((mod) => renderEdgeQL(mod.expr as any, ctx))
            .join(" AND ")}`
        );
      }
      if (mods.order.length) {
        lines.push(
          ...mods.order.map(
            (mod, i) =>
              `${i === 0 ? "ORDER BY" : "THEN"} ${renderEdgeQL(
                mod.expr as any,
                ctx
              )}${mod.direction ? " " + mod.direction : ""}${
                mod.empty ? " " + mod.empty : ""
              }`
          )
        );
      }
      if (mods.offsetBy) {
        lines.push(`OFFSET ${renderEdgeQL(mods.offsetBy.expr as any, ctx)}`);
      }
      if (mods.limit) {
        lines.push(`LIMIT ${renderEdgeQL(mods.limit.expr as any, ctx)}`);
      }

      return withBlock + lines.join("\n");
    }

    if (expr.__element__.__kind__ === TypeKind.object) {
      const lines = [];
      lines.push(
        `SELECT${
          expr.__expr__.__element__.__name__ === "std::FreeObject"
            ? ""
            : ` (${renderEdgeQL(expr.__expr__ as any, ctx)})`
        }`
      );

      lines.push(
        shapeToEdgeQL(
          (expr.__element__.__params__ || {}) as object,
          expr.__element__.__polys__ || [],
          ctx
        )
      );
      return withBlock + lines.join(" ");
    } else {
      // non-object/non-shape select expression
      return withBlock + `SELECT (${renderEdgeQL(expr.__expr__ as any, ctx)})`;
    }
  } else if (expr.__kind__ === ExpressionKind.Function) {
    const args = expr.__args__.map(
      (arg) => `(${renderEdgeQL(arg as any, ctx)})`
    );
    for (const [key, arg] of Object.entries(expr.__namedargs__)) {
      args.push(`${key} := (${renderEdgeQL(arg as any, ctx)})`);
    }
    return `${expr.__name__}(${args.join(", ")})`;
  } else if (expr.__kind__ === ExpressionKind.Operator) {
    const operator = expr.__name__.split("::")[1];
    const args = expr.__args__;
    switch (expr.__opkind__) {
      case "Infix":
        if (operator === "[]") {
          const val = (args[1] as any).__value__;
          return `(${renderEdgeQL(args[0] as any, ctx)}[${
            Array.isArray(val) ? val.join(":") : val
          }])`;
        }
        return `(${renderEdgeQL(
          args[0] as any,
          ctx
        )} ${operator} ${renderEdgeQL(args[1] as any, ctx)})`;
      case "Postfix":
        return `(${renderEdgeQL(args[0] as any, ctx)} ${operator})`;
      case "Prefix":
        return `(${operator} ${renderEdgeQL(args[0] as any, ctx)})`;
      case "Ternary":
        if (operator === "IF") {
          return `(${renderEdgeQL(args[0] as any, ctx)} IF ${renderEdgeQL(
            args[1] as any,
            ctx
          )} ELSE ${renderEdgeQL(args[2] as any, ctx)})`;
        } else {
          throw new Error(`Unknown operator: ${operator}`);
        }
      default:
        util.assertNever(
          expr.__opkind__,
          new Error(`Unknown operator kind: ${expr.__opkind__}`)
        );
    }
  } else if (expr.__kind__ === ExpressionKind.TypeIntersection) {
    return `${renderEdgeQL(expr.__expr__ as any, ctx)}[IS ${
      expr.__element__.__name__
    }]`;
  } else if (expr.__kind__ === ExpressionKind.For) {
    ctx.forVars.set(expr.__forVar__, `__forVar__${ctx.forVars.size}`);
    return (
      withBlock +
      `FOR ${ctx.forVars.get(expr.__forVar__)} IN {${renderEdgeQL(
        expr.__iterSet__ as any,
        ctx
      )}}
UNION (${renderEdgeQL(expr.__expr__ as any, ctx)})`
    );
  } else if (expr.__kind__ === ExpressionKind.ForVar) {
    const forVar = ctx.forVars.get(expr);
    if (!forVar) {
      throw new Error(`'FOR' loop variable used outside of 'FOR' loop`);
    }
    return forVar;
  } else if (expr.__kind__ === ExpressionKind.Param) {
    return `<${expr.__element__.__name__}>$${expr.__name__}`;
  } else {
    util.assertNever(
      expr,
      new Error(`Unrecognized expression kind: "${(expr as any).__kind__}"`)
    );
  }
}

interface WalkExprTreeCtx {
  seen: Map<
    SomeExpression,
    {
      refCount: number;
      parentScopes: Set<WithScopeExpr | null>;
      childExprs: SomeExpression[];
      boundScope: WithScopeExpr | null;
      aliases: SomeExpression[];
    }
  >;
  rootScope: WithScopeExpr | null;
}

function walkExprTree(
  expr: SomeExpression,
  parentScope: WithScopeExpr | null,
  ctx: WalkExprTreeCtx
): SomeExpression[] {
  if (!ctx.rootScope && parentScope) {
    ctx.rootScope = parentScope;
  }
  const seenExpr = ctx.seen.get(expr);
  if (seenExpr) {
    seenExpr.refCount += 1;
    seenExpr.parentScopes.add(parentScope);

    return [expr, ...seenExpr.childExprs];
  } else {
    const childExprs: SomeExpression[] = [];
    ctx.seen.set(expr, {
      refCount: 1,
      parentScopes: new Set([parentScope]),
      childExprs,
      boundScope: null,
      aliases: [],
    });

    switch (expr.__kind__) {
      case ExpressionKind.Alias:
        childExprs.push(
          ...walkExprTree(expr.__expr__ as any, parentScope, ctx)
        );
        ctx.seen.get(expr.__expr__ as any)!.aliases.push(expr);
        break;
      case ExpressionKind.With:
        childExprs.push(
          ...walkExprTree(expr.__expr__ as any, parentScope, ctx)
        );
        for (const refExpr of expr.__refs__) {
          walkExprTree(refExpr as any, expr.__expr__, ctx);
          const seenRef = ctx.seen.get(refExpr as any)!;
          if (seenRef.boundScope) {
            throw new Error(`Expression bound to multiple 'WITH' blocks`);
          }
          seenRef.boundScope = expr.__expr__;
        }
        break;
      case ExpressionKind.Literal:
      case ExpressionKind.PathLeaf:
      case ExpressionKind.PathNode:
      case ExpressionKind.ForVar:
      case ExpressionKind.Param:
        break;
      case ExpressionKind.Cast:
        childExprs.push(
          ...walkExprTree(expr.__expr__ as any, parentScope, ctx)
        );
        break;
      case ExpressionKind.Set:
        for (const subExpr of expr.__exprs__) {
          childExprs.push(...walkExprTree(subExpr as any, parentScope, ctx));
        }
        break;
      case ExpressionKind.Select: {
        if (expr.__modifier__) {
          childExprs.push(
            ...walkExprTree(expr.__modifier__.expr as any, expr, ctx)
          );
        }
        if (expr.__element__.__kind__ === TypeKind.object) {
          for (const param of Object.values(
            expr.__element__.__params__ ?? {}
          )) {
            if (typeof param !== "boolean") {
              childExprs.push(...walkExprTree(param as any, expr, ctx));
            }
          }
        }
        childExprs.push(...walkExprTree(expr.__expr__ as any, expr, ctx));
        break;
      }
      case ExpressionKind.TypeIntersection:
        childExprs.push(
          ...walkExprTree(expr.__expr__ as any, parentScope, ctx)
        );
        break;
      case ExpressionKind.Operator:
      case ExpressionKind.Function:
        for (const subExpr of expr.__args__) {
          childExprs.push(...walkExprTree(subExpr as any, parentScope, ctx));
        }
        if (expr.__kind__ === ExpressionKind.Function) {
          for (const subExpr of Object.values(expr.__namedargs__)) {
            childExprs.push(...walkExprTree(subExpr as any, parentScope, ctx));
          }
        }
        break;
      case ExpressionKind.For: {
        childExprs.push(...walkExprTree(expr.__iterSet__ as any, expr, ctx));
        childExprs.push(...walkExprTree(expr.__expr__ as any, expr, ctx));
        break;
      }
      case ExpressionKind.WithParams: {
        if (parentScope !== null) {
          throw new Error(
            `'withParams' does not support being used as a nested expression`
          );
        }
        childExprs.push(
          ...walkExprTree(expr.__expr__ as any, parentScope, ctx)
        );
        break;
      }
      default:
        util.assertNever(
          expr,
          new Error(
            `Unrecognized expression kind: "${(expr as any).__kind__}"`
          )
        );
    }

    return [expr, ...childExprs];
  }
}

const noCastTypes = new Set(["std::str"]);

export function literalToEdgeQL(type: MaterialType, val: any): string {
  let stringRep;
  if (typeof val === "string") {
    stringRep = JSON.stringify(val);
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
  if (noCastTypes.has(type.__name__)) {
    return stringRep;
  }
  return `<${type.__name__}>${stringRep}`;
}

function indent(str: string, depth: number) {
  return str
    .split("\n")
    .map((line) => " ".repeat(depth) + line)
    .join("\n");
}

import {$expr_Delete} from "@generated/syntax/select";
import {Duration, LocalDate, LocalDateTime, LocalTime} from "edgedb";
import {
  BaseType,
  Cardinality,
  ExpressionKind,
  isArrayType,
  isNamedTupleType,
  isObjectType,
  isTupleType,
  OperatorKind,
  TypeKind,
  TypeSet,
  util,
} from "../reflection";
import type {$expr_Literal} from "../reflection/literal";
import type {
  $expr_PathLeaf,
  $expr_PathNode,
  $expr_TypeIntersection,
} from "../reflection/path";
import type {$expr_Cast} from "./cast";
import type {$expr_Detached} from "./detached";
import type {$expr_For, $expr_ForVar} from "./for";
import type {$expr_Function, $expr_Operator} from "./funcops";
import {$expr_Insert, $expr_InsertUnlessConflict} from "./insert";
import type {$expr_Param, $expr_WithParams} from "./params";
import type {$expr_Set} from "./set";
import {$expr_Update} from "./update";
import type {$expr_Select, OffsetExpression, LimitExpression} from "./select";

import type {$expr_Alias, $expr_With} from "./with";

export type SomeExpression =
  | $expr_PathNode
  | $expr_PathLeaf
  | $expr_Literal
  | $expr_Set
  | $expr_Cast
  | $expr_Select
  | $expr_Delete
  | $expr_Update
  | $expr_Insert
  | $expr_InsertUnlessConflict
  | $expr_Function
  | $expr_Operator
  | $expr_For
  | $expr_ForVar
  | $expr_TypeIntersection
  | $expr_Alias
  | $expr_With
  | $expr_WithParams
  | $expr_Param
  | $expr_Detached;

type WithScopeExpr =
  | $expr_Select
  | $expr_Update
  | $expr_Insert
  | $expr_InsertUnlessConflict
  | $expr_For;

function shapeToEdgeQL(
  shape: object | null,
  ctx: RenderCtx,
  keysOnly: boolean = false,
  params: {depth: number} = {depth: 1}
) {
  if (shape === null) {
    return ``;
  }
  const depth = params.depth ?? 1;
  const lines: string[] = [];
  const addLine = (line: string) =>
    lines.push(`${keysOnly ? "" : "  ".repeat(depth)}${line}`);

  // const elements = [{type: null, params: basicShape}];
  const seen = new Set();
  // for (const element of elements) {
  //   const shape = element.params;
  //   const polyType = element.type?.__name__;
  //   const polyIntersection = polyType ? `[IS ${polyType}].` : "";

  for (const key in shape) {
    if (!shape.hasOwnProperty(key)) continue;
    if (seen.has(key)) {
      // tslint:disable-next-line
      console.warn(`Invalid: duplicate key "${key}"`);
      continue;
    }
    seen.add(key);
    let val = (shape as any)[key];
    let operator = ":=";
    let polyType = "";

    if (!!val["+="]) {
      operator = "+=";
      val = val["+="];
    }
    if (!!val["-="]) {
      operator = "-=";
      val = val["-="];
    }
    if (val.__kind__ === ExpressionKind.PolyShapeElement) {
      polyType = val.__polyType__.__element__.__name__;
      val = val.__shapeElement__;
    }
    const polyIntersection = polyType ? `[IS ${polyType}].` : "";

    if (val === true) {
      addLine(`${polyIntersection}${key}`);
    } else if (val.hasOwnProperty("__kind__")) {
      if (keysOnly) continue;
      // if (polyIntersection) {
      //   // tslint:disable-next-line
      //   console.warn(
      //     `Invalid: no computable fields inside polymorphic shapes.`
      //   );
      //   continue;
      // }
      const renderedExpr = renderEdgeQL(val, ctx);

      addLine(
        `${key} ${operator} (${
          renderedExpr.includes("\n")
            ? `\n${indent(renderedExpr, (depth + 1) * 2)}\n${"  ".repeat(
                depth
              )}`
            : renderedExpr
        })`
      );
    } else if (typeof val === "object") {
      addLine(
        `${polyIntersection}${key}: ${shapeToEdgeQL(val, ctx, keysOnly, {
          depth: depth + 1,
        })}`
      );
    } else {
      throw new Error("Invalid shape.");
    }
  }

  if (lines.length === 0) {
    addLine("id");
  }
  return keysOnly
    ? `{${lines.join(", ")}}`
    : `{\n${lines.join(",\n")}\n${"  ".repeat(depth - 1)}}`;
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
      expr.__kind__ === ExpressionKind.PathNode ||
      expr.__kind__ === ExpressionKind.PathLeaf ||
      expr.__kind__ === ExpressionKind.ForVar
    ) {
      continue;
    }

    if (
      expr.__kind__ === ExpressionKind.Select &&
      walkExprCtx.seen.get(expr.__scope__ as any)?.refCount
    ) {
      const withBlock = expr;
      if (!withBlocks.has(withBlock)) {
        withBlocks.set(withBlock, new Set());
      }

      const scopeVar = expr.__scope__! as SomeExpression;

      const scopeVarName = `__scope_${withVars.size}_${
        scopeVar.__element__.__name__.split("::")[1]
      }`;

      withBlocks.get(withBlock)!.add(scopeVar);
      withVars.set(scopeVar, {
        name: scopeVarName,
        scope: withBlock,
        childExprs: new Set(),
      });
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
        ...refData.aliases.flatMap(alias => [
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
          // withVar is an alias already explicitly bound
          // to an inner WITH block
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

function renderEdgeQL(
  _expr: TypeSet,
  ctx: RenderCtx,
  renderShape: boolean = true,
  noImplicitDetached: boolean = false
): string {
  if (!(_expr as any).__kind__) {
    throw new Error("Invalid expression.");
  }
  const expr = _expr as SomeExpression;

  if (ctx.withVars.has(expr) && ctx.renderWithVar !== expr) {
    return (
      ctx.withVars.get(expr)!.name +
      (renderShape &&
      expr.__kind__ === ExpressionKind.Select &&
      isObjectType(expr.__element__)
        ? " " +
          shapeToEdgeQL(
            (expr.__element__.__shape__ || {}) as object,

            ctx,
            true
          )
        : "")
    );
  }

  let withBlock = "";
  let selectWrapping = ["", ""];
  if (ctx.withBlocks.has(expr as any)) {
    let blockVars = topoSortWithVars(ctx.withBlocks.get(expr as any)!, ctx);

    if (
      expr.__kind__ === ExpressionKind.Select &&
      expr.__scope__ &&
      blockVars.some(blockVar =>
        ctx.withVars.get(blockVar)!.childExprs.has(expr.__scope__ as any)
      )
    ) {
      blockVars = blockVars.filter(blockVar => blockVar !== expr.__scope__);
      selectWrapping = [
        `FOR ${
          ctx.withVars.get(expr.__scope__ as any)!.name
        } IN {${renderEdgeQL(expr.__scope__, {
          ...ctx,
          renderWithVar: expr.__scope__ as any,
        })}} UNION (\n`,
        `\n)`,
      ];
    }

    withBlock = blockVars.length
      ? `WITH\n${blockVars
          .map(varExpr => {
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
    return renderEdgeQL(expr.__expr__, ctx);
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
      return `${noImplicitDetached ? "" : "DETACHED "}${
        expr.__element__.__name__
      }`;
    } else {
      return `${renderEdgeQL(
        expr.__parent__.type,
        ctx,
        undefined,
        noImplicitDetached
      )}.${expr.__parent__.linkName}`.trim();
    }
  } else if (expr.__kind__ === ExpressionKind.Literal) {
    return literalToEdgeQL(expr.__element__, expr.__value__);
  } else if (expr.__kind__ === ExpressionKind.Set) {
    const exprs = expr.__exprs__;

    if (
      exprs.every(ex => ex.__element__.__kind__ === TypeKind.object) ||
      exprs.every(ex => ex.__element__.__kind__ !== TypeKind.object)
    ) {
      if (exprs.length === 0) return `<${expr.__element__.__name__}>{}`;
      return `{ ${exprs.map(ex => renderEdgeQL(ex, ctx)).join(", ")} }`;
    } else {
      throw new Error(
        `Invalid arguments to set constructor: ${exprs
          .map(ex => expr.__element__.__name__)
          .join(", ")}`
      );
    }
  } else if (expr.__kind__ === ExpressionKind.Cast) {
    return `<${expr.__element__.__name__}>${renderEdgeQL(expr.__expr__, ctx)}`;
  } else if (expr.__kind__ === ExpressionKind.Select) {
    if (isObjectType(expr.__element__)) {
      const lines = [];
      lines.push(
        `SELECT${
          expr.__expr__.__element__.__name__ === "std::FreeObject"
            ? ""
            : ` (${renderEdgeQL(
                ctx.withBlocks.get(expr)?.has(expr.__scope__ as any)
                  ? expr.__scope__!
                  : expr.__expr__,
                ctx,
                false,
                noImplicitDetached
              )})`
        }`
      );

      lines.push(
        shapeToEdgeQL(
          (expr.__element__.__shape__ || {}) as object,

          ctx
        )
      );

      const modifiers = [];

      if (expr.__modifiers__.filter) {
        modifiers.push(
          `FILTER ${renderEdgeQL(expr.__modifiers__.filter, ctx)}`
        );
      }
      if (expr.__modifiers__.order) {
        modifiers.push(
          ...expr.__modifiers__.order.map(
            ({expression, direction, empty}, i) => {
              return `${i === 0 ? "ORDER BY" : "  THEN"} ${renderEdgeQL(
                expression,
                ctx
              )}${direction ? " " + direction : ""}${
                empty ? " " + empty : ""
              }`;
            }
          )
        );
      }
      if (expr.__modifiers__.offset) {
        modifiers.push(
          `OFFSET ${renderEdgeQL(
            expr.__modifiers__.offset as OffsetExpression,
            ctx
          )}`
        );
      }
      if (expr.__modifiers__.limit) {
        modifiers.push(
          `LIMIT ${renderEdgeQL(
            expr.__modifiers__.limit as LimitExpression,
            ctx
          )}`
        );
      }

      return (
        selectWrapping[0] +
        withBlock +
        lines.join(" ") +
        (modifiers.length ? "\n" + modifiers.join("\n") : "") +
        selectWrapping[1]
      );
    } else {
      // non-object/non-shape select expression
      return (
        selectWrapping[0] +
        withBlock +
        `SELECT (${renderEdgeQL(expr.__expr__, ctx)})` +
        selectWrapping[1]
      );
    }
  } else if (expr.__kind__ === ExpressionKind.Update) {
    return `UPDATE (${renderEdgeQL(expr.__expr__, ctx)}) SET ${shapeToEdgeQL(
      expr.__shape__,
      ctx
    )}`;
  } else if (expr.__kind__ === ExpressionKind.Delete) {
    return `DELETE (${renderEdgeQL(expr.__expr__, ctx)})`;
  } else if (expr.__kind__ === ExpressionKind.Insert) {
    return `INSERT ${renderEdgeQL(
      expr.__expr__,
      ctx,
      false,
      true
    )} ${shapeToEdgeQL(expr.__shape__, ctx)}`;
  } else if (expr.__kind__ === ExpressionKind.InsertUnlessConflict) {
    const $on = expr.__conflict__.on;
    const $else = expr.__conflict__.else;
    const clause: string[] = [];
    if (!$on) {
      clause.push("\nUNLESS CONFLICT");
    }
    if ($on) {
      clause.push(
        `\nUNLESS CONFLICT ON ${renderEdgeQL($on, ctx, false, true)}`
      );
    }
    if ($else) {
      clause.push(`\nELSE ${renderEdgeQL($else, ctx, true, true)}`);
    }
    return `${renderEdgeQL(expr.__expr__, ctx, false, true)} ${clause.join(
      ""
    )}`;
  } else if (expr.__kind__ === ExpressionKind.Function) {
    const args = expr.__args__.map(
      arg => `(${renderEdgeQL(arg!, ctx, false)})`
    );
    for (const [key, arg] of Object.entries(expr.__namedargs__)) {
      args.push(`${key} := (${renderEdgeQL(arg, ctx, false)})`);
    }
    return `${expr.__name__}(${args.join(", ")})`;
  } else if (expr.__kind__ === ExpressionKind.Operator) {
    const operator = expr.__name__.split("::")[1];
    const args = expr.__args__;
    switch (expr.__opkind__) {
      case OperatorKind.Infix:
        if (operator === "[]") {
          const val = (args[1] as any).__value__;
          return `(${renderEdgeQL(args[0], ctx)}[${
            Array.isArray(val) ? val.join(":") : val
          }])`;
        }
        return `(${renderEdgeQL(args[0], ctx)} ${operator} ${renderEdgeQL(
          args[1],
          ctx
        )})`;
      case OperatorKind.Postfix:
        return `(${renderEdgeQL(args[0], ctx)} ${operator})`;
      case OperatorKind.Prefix:
        return `(${operator} ${renderEdgeQL(args[0], ctx)})`;
      case OperatorKind.Ternary:
        if (operator === "IF") {
          return `(${renderEdgeQL(args[0], ctx)} IF ${renderEdgeQL(
            args[1],
            ctx
          )} ELSE ${renderEdgeQL(args[2], ctx)})`;
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
    return `${renderEdgeQL(expr.__expr__, ctx)}[IS ${
      expr.__element__.__name__
    }]`;
  } else if (expr.__kind__ === ExpressionKind.For) {
    ctx.forVars.set(expr.__forVar__, `__forVar__${ctx.forVars.size}`);
    return (
      withBlock +
      `FOR ${ctx.forVars.get(expr.__forVar__)} IN {${renderEdgeQL(
        expr.__iterSet__,
        ctx
      )}}
UNION (\n${indent(renderEdgeQL(expr.__expr__, ctx), 2)}\n)`
    );
  } else if (expr.__kind__ === ExpressionKind.ForVar) {
    const forVar = ctx.forVars.get(expr);
    if (!forVar) {
      throw new Error(`'FOR' loop variable used outside of 'FOR' loop`);
    }
    return forVar;
  } else if (expr.__kind__ === ExpressionKind.Param) {
    return `<${
      expr.__cardinality__ === Cardinality.AtMostOne ? "OPTIONAL " : ""
    }${expr.__element__.__name__}>$${expr.__name__}`;
  } else if (expr.__kind__ === ExpressionKind.Detached) {
    return `DETACHED ${renderEdgeQL(expr.__expr__, ctx)}`;
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
  _expr: TypeSet,
  parentScope: WithScopeExpr | null,
  ctx: WalkExprTreeCtx
): SomeExpression[] {
  if (!(_expr as any).__kind__) {
    throw new Error("Invalid expression.");
  }
  const expr = _expr as SomeExpression;
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
        childExprs.push(...walkExprTree(expr.__expr__, parentScope, ctx));
        ctx.seen.get(expr.__expr__ as any)!.aliases.push(expr);
        break;
      case ExpressionKind.With:
        childExprs.push(...walkExprTree(expr.__expr__, parentScope, ctx));
        for (const refExpr of expr.__refs__) {
          walkExprTree(refExpr, expr.__expr__, ctx);
          const seenRef = ctx.seen.get(refExpr as any)!;
          if (seenRef.boundScope) {
            throw new Error(`Expression bound to multiple 'WITH' blocks`);
          }
          seenRef.boundScope = expr.__expr__;
        }
        break;
      case ExpressionKind.Literal:
      case ExpressionKind.ForVar:
      case ExpressionKind.Param:
        break;
      case ExpressionKind.PathLeaf:
      case ExpressionKind.PathNode:
        if (expr.__parent__) {
          let parentNode = expr.__parent__.type as any;
          while (
            parentNode.__kind__ === ExpressionKind.PathNode &&
            parentNode.__parent__
          ) {
            parentNode = parentNode.__parent__.type;
          }
          childExprs.push(...walkExprTree(parentNode, parentScope, ctx));
        }
        break;
      case ExpressionKind.Cast:
        childExprs.push(...walkExprTree(expr.__expr__, parentScope, ctx));
        break;
      case ExpressionKind.Set:
        for (const subExpr of expr.__exprs__) {
          childExprs.push(...walkExprTree(subExpr, parentScope, ctx));
        }
        break;
      case ExpressionKind.Select: {
        const modifiers = expr.__modifiers__;
        if (modifiers.filter) {
          childExprs.push(...walkExprTree(modifiers.filter, expr, ctx));
        }
        if (modifiers.order) {
          for (const orderExpr of modifiers.order) {
            childExprs.push(...walkExprTree(orderExpr.expression, expr, ctx));
          }
        }
        if (modifiers.offset) {
          childExprs.push(
            ...walkExprTree(modifiers.offset as OffsetExpression, expr, ctx)
          );
        }
        if (modifiers.limit) {
          childExprs.push(
            ...walkExprTree(modifiers.limit as LimitExpression, expr, ctx)
          );
        }
        if (isObjectType(expr.__element__)) {
          const walkShape = (shape: object) => {
            for (let param of Object.values(shape)) {
              if (param.__kind__ === ExpressionKind.PolyShapeElement) {
                param = param.__shapeElement__;
              }
              if (typeof param === "object") {
                if (!!(param as any).__kind__) {
                  childExprs.push(...walkExprTree(param as any, expr, ctx));
                } else {
                  walkShape(param);
                }
              }
            }
          };
          walkShape(expr.__element__.__shape__ ?? {});
        }

        childExprs.push(...walkExprTree(expr.__expr__, expr, ctx));
        break;
      }

      case ExpressionKind.Update: {
        const shape: any = expr.__shape__ ?? {};

        for (const _element of Object.values(shape)) {
          let element: any = _element;
          if (element["+="]) element = element["+="];
          if (element["-="]) element = element["-="];
          childExprs.push(...walkExprTree(element as any, expr, ctx));
        }

        childExprs.push(...walkExprTree(expr.__expr__, expr, ctx));
        break;
      }
      case ExpressionKind.Delete: {
        childExprs.push(...walkExprTree(expr.__expr__, parentScope, ctx));
        break;
      }
      case ExpressionKind.Insert: {
        const shape: any = expr.__shape__ ?? {};

        for (const element of Object.values(shape)) {
          childExprs.push(...walkExprTree(element as any, expr, ctx));
        }

        childExprs.push(...walkExprTree(expr.__expr__, expr, ctx));
        break;
      }
      case ExpressionKind.InsertUnlessConflict: {
        if (expr.__conflict__.on) {
          childExprs.push(...walkExprTree(expr.__conflict__.on, expr, ctx));
        }
        if (expr.__conflict__.else) {
          childExprs.push(...walkExprTree(expr.__conflict__.else, expr, ctx));
        }

        childExprs.push(...walkExprTree(expr.__expr__, expr, ctx));
        break;
      }
      case ExpressionKind.TypeIntersection:
        childExprs.push(...walkExprTree(expr.__expr__, parentScope, ctx));
        break;
      case ExpressionKind.Operator:
      case ExpressionKind.Function:
        for (const subExpr of expr.__args__) {
          childExprs.push(...walkExprTree(subExpr!, parentScope, ctx));
        }
        if (expr.__kind__ === ExpressionKind.Function) {
          for (const subExpr of Object.values(expr.__namedargs__)) {
            childExprs.push(...walkExprTree(subExpr, parentScope, ctx));
          }
        }
        break;
      case ExpressionKind.For: {
        childExprs.push(...walkExprTree(expr.__iterSet__ as any, expr, ctx));
        childExprs.push(...walkExprTree(expr.__expr__, expr, ctx));
        break;
      }
      case ExpressionKind.WithParams: {
        if (parentScope !== null) {
          throw new Error(
            `'withParams' does not support being used as a nested expression`
          );
        }
        childExprs.push(...walkExprTree(expr.__expr__, parentScope, ctx));
        break;
      }
      case ExpressionKind.Detached: {
        childExprs.push(...walkExprTree(expr.__expr__, parentScope, ctx));
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

export function literalToEdgeQL(type: BaseType, val: any): string {
  let skipCast = false;
  let stringRep;
  if (typeof val === "string") {
    if (type.__name__ === "std::str") {
      skipCast = true;
    }
    stringRep = JSON.stringify(val);
  } else if (typeof val === "number") {
    const isInt = Number.isInteger(val);
    if (
      (type.__name__ === "std::int64" && isInt) ||
      (type.__name__ === "std::float64" && !isInt)
    ) {
      skipCast = true;
    }
    stringRep = `${val.toString()}`;
  } else if (typeof val === "boolean") {
    stringRep = `${val.toString()}`;
  } else if (typeof val === "bigint") {
    stringRep = `${val.toString()}n`;
  } else if (Array.isArray(val)) {
    if (isArrayType(type)) {
      stringRep = `[${val
        .map(el => literalToEdgeQL(type.__element__ as any, el))
        .join(", ")}]`;
    } else if (isTupleType(type)) {
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
    if (isNamedTupleType(type)) {
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
  if (skipCast) {
    return stringRep;
  }
  return `<${type.__name__}>${stringRep}`;
}

function indent(str: string, depth: number) {
  return str
    .split("\n")
    .map(line => " ".repeat(depth) + line)
    .join("\n");
}

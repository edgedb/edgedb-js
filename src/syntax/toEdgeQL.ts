import {Duration, LocalDate, LocalDateTime, LocalTime} from "edgedb";
import {
  $expr_Array,
  $expr_NamedTuple,
  $expr_Tuple,
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
import reservedKeywords from "../reflection/reservedKeywords";
import type {$expr_Cast} from "./cast";
import type {$expr_Detached} from "./detached";
import type {$expr_For, $expr_ForVar} from "./for";
import type {$expr_Function, $expr_Operator} from "./funcops";
import type {$expr_Insert, $expr_InsertUnlessConflict} from "./insert";
import type {$expr_Param, $expr_WithParams} from "./params";
import type {
  $expr_Delete,
  $expr_Select,
  LimitExpression,
  OffsetExpression,
} from "./select";
import type {$expr_Set} from "./set";
import type {$expr_Update} from "./update";
import type {$expr_Alias, $expr_With} from "./with";

export type SomeExpression =
  | $expr_PathNode
  | $expr_PathLeaf
  | $expr_Literal
  | $expr_Set
  | $expr_Array
  | $expr_Tuple
  | $expr_NamedTuple
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
  keysOnly: boolean = false
) {
  if (shape === null) {
    return ``;
  }
  const lines: string[] = [];
  const addLine = (line: string) =>
    lines.push(`${keysOnly ? "" : "  "}${line}`);

  const seen = new Set();

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
    let polyType: SomeExpression | null = null;

    if (!!val["+="]) {
      operator = "+=";
      val = val["+="];
    }
    if (!!val["-="]) {
      operator = "-=";
      val = val["-="];
    }
    if (val.__kind__ === ExpressionKind.PolyShapeElement) {
      polyType = val.__polyType__;
      val = val.__shapeElement__;
    }
    const polyIntersection = polyType
      ? `[IS ${polyType.__element__.__name__}].`
      : "";

    if (typeof val === "boolean") {
      if (val) {
        addLine(`${polyIntersection}${q(key)}`);
      }
    } else if (val.hasOwnProperty("__kind__")) {
      if (keysOnly) {
        addLine(q(key));
        continue;
      }
      const renderedExpr = renderEdgeQL(val, ctx);

      addLine(
        `${q(key)} ${operator} (${
          renderedExpr.includes("\n")
            ? `\n${indent(renderedExpr, 4)}\n  `
            : renderedExpr
        })`
      );
    } else {
      throw new Error("Invalid shape.");
    }
  }

  if (lines.length === 0) {
    addLine("id");
  }
  return keysOnly ? `{${lines.join(", ")}}` : `{\n${lines.join(",\n")}\n}`;
}

interface RenderCtx {
  withBlocks: Map<WithScopeExpr, Set<SomeExpression>>;
  withVars: Map<
    SomeExpression,
    {
      name: string;
      scope: WithScopeExpr;
      childExprs: Set<SomeExpression>;
      scopedExpr?: SomeExpression;
    }
  >;
  renderWithVar?: SomeExpression;
  forVars: Map<$expr_ForVar, string>;
}

const toEdgeQLCache = new WeakMap<any, string>();

export function $toEdgeQL(this: any) {
  if (toEdgeQLCache.has(this)) {
    return toEdgeQLCache.get(this)!;
  }

  const walkExprCtx: WalkExprTreeCtx = {
    seen: new Map(),
    rootScope: null,
  };

  walkExprTree(this, null, walkExprCtx);

  const withBlocks = new Map<WithScopeExpr, Set<SomeExpression>>();
  const withVars = new Map<
    SomeExpression,
    {
      name: string;
      scope: WithScopeExpr;
      childExprs: Set<SomeExpression>;
      scopedExpr?: SomeExpression;
    }
  >();

  const seen = new Map(walkExprCtx.seen);

  for (const [expr, refData] of seen) {
    seen.delete(expr);

    if (
      withVars.has(expr) ||
      expr.__kind__ === ExpressionKind.PathLeaf ||
      expr.__kind__ === ExpressionKind.PathNode ||
      expr.__kind__ === ExpressionKind.ForVar ||
      expr.__kind__ === ExpressionKind.TypeIntersection
    ) {
      continue;
    }

    if (
      expr.__kind__ === ExpressionKind.Select &&
      expr.__scope__ &&
      !withVars.has(expr.__scope__ as any)
    ) {
      const withBlock = expr;
      const scopeVar = expr.__scope__ as SomeExpression;

      const scopeVarName = `__scope_${withVars.size}_${
        scopeVar.__element__.__name__.split("::")[1]
      }`;

      withVars.set(scopeVar, {
        name: scopeVarName,
        scope: withBlock,
        childExprs: new Set(),
        scopedExpr:
          expr.__element__.__kind__ === TypeKind.object
            ? (expr.__expr__ as any)
            : undefined,
      });
    }

    if (
      refData.boundScope ||
      refData.refCount > 1 ||
      refData.aliases.length > 0
    ) {
      let withBlock = refData.boundScope;

      const parentScopes = [...refData.parentScopes].filter(
        scope => scope !== null
      ) as WithScopeExpr[];
      if (!withBlock) {
        if (parentScopes.some(parentScope => seen.has(parentScope))) {
          // parent scopes haven't all been resolved yet, re-add current
          // expr to seen list to resolve later
          seen.set(expr, refData);
          continue;
        }

        const resolvedParentScopes = parentScopes.map(
          parentScope => withVars.get(parentScope)?.scope ?? parentScope
        );
        withBlock =
          resolvedParentScopes.find(parentScope => {
            const childExprs = new Set(
              walkExprCtx.seen.get(parentScope)!.childExprs
            );
            return resolvedParentScopes.every(
              scope => scope === parentScope || childExprs.has(scope)
            );
          }) ?? walkExprCtx.rootScope;
      }

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
        ...util.flatMap(refData.aliases, alias => [
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

  const edgeQL = renderEdgeQL(this, {
    withBlocks,
    withVars,
    forVars: new Map(),
  });
  toEdgeQLCache.set(this, edgeQL);

  return edgeQL;
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

  const withVar = ctx.withVars.get(expr);
  if (withVar && ctx.renderWithVar !== expr) {
    return (
      withVar.name +
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

  function renderWithBlockExpr(varExpr: SomeExpression) {
    const withBlockElement = ctx.withVars.get(varExpr)!;
    const renderedExpr = renderEdgeQL(
      withBlockElement.scopedExpr ?? varExpr,
      {
        ...ctx,
        renderWithVar: varExpr,
      },
      !withBlockElement.scopedExpr
    );
    return `  ${withBlockElement.name} := (${
      renderedExpr.includes("\n")
        ? `\n${indent(renderedExpr, 4)}\n  `
        : renderedExpr
    })`;
  }

  let withBlock = "";
  const scopeExpr =
    expr.__kind__ === ExpressionKind.Select &&
    ctx.withVars.has(expr.__scope__ as any)
      ? (expr.__scope__ as SomeExpression)
      : undefined;
  if (ctx.withBlocks.has(expr as any) || scopeExpr) {
    let blockVars = topoSortWithVars(
      ctx.withBlocks.get(expr as any) ?? new Set(),
      ctx
    );

    const scopedWithBlock: string[] = [];
    if (scopeExpr) {
      const scopeVar = ctx.withVars.get(scopeExpr)!;

      const scopedBlockVars = blockVars.filter(blockVarExpr =>
        ctx.withVars.get(blockVarExpr)?.childExprs.has(scopeExpr)
      );
      blockVars = blockVars.filter(
        blockVar => !scopedBlockVars.includes(blockVar)
      );

      if (scopedBlockVars.length) {
        const scopeName = scopeVar.name;
        scopeVar.name = scopeName + "_expr";
        scopedWithBlock.push(renderWithBlockExpr(scopeExpr));

        scopeVar.name = scopeName + "_inner";
        scopedWithBlock.push(
          `  ${scopeName} := (FOR ${scopeVar.name} IN {${
            scopeName + "_expr"
          }} UNION (\n    WITH\n${indent(
            scopedBlockVars
              .map(blockVar => renderWithBlockExpr(blockVar))
              .join(",\n"),
            4
          )}\n    SELECT ${scopeVar.name} {\n${scopedBlockVars
            .map(blockVar => {
              const name = ctx.withVars.get(blockVar)!.name;
              return `      ${name} := ${name}`;
            })
            .join(",\n")}\n    }\n  ))`
        );

        scopeVar.name = scopeName;
        for (const blockVarExpr of scopedBlockVars) {
          const blockVar = ctx.withVars.get(blockVarExpr)!;
          blockVar.name = `${scopeName}.${blockVar.name}`;
        }
      } else {
        scopedWithBlock.push(renderWithBlockExpr(scopeExpr!));
      }
    }
    withBlock = `WITH\n${[
      ...blockVars.map(blockVar => renderWithBlockExpr(blockVar)),
      ...scopedWithBlock,
    ].join(",\n")}\n`;
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
        false,
        noImplicitDetached
      )}.${q(expr.__parent__.linkName)}`.trim();
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
  } else if (expr.__kind__ === ExpressionKind.Array) {
    // ExpressionKind.Array
    return `[\n${expr.__items__
      .map(item => `  ` + renderEdgeQL(item, ctx))
      .join(",\n")}\n]`;
  } else if (expr.__kind__ === ExpressionKind.Tuple) {
    // ExpressionKind.Tuple
    return `(\n${expr.__items__
      .map(item => `  ` + renderEdgeQL(item, ctx))
      .join(",\n")}\n)`;
  } else if (expr.__kind__ === ExpressionKind.NamedTuple) {
    // ExpressionKind.NamedTuple
    return `(\n${Object.keys(expr.__shape__)
      .map(key => `  ${key} := ${renderEdgeQL(expr.__shape__[key], ctx)}`)
      .join(",\n")}\n)`;
  } else if (expr.__kind__ === ExpressionKind.Cast) {
    return `<${expr.__element__.__name__}>${renderEdgeQL(expr.__expr__, ctx)}`;
  } else if (expr.__kind__ === ExpressionKind.Select) {
    if (isObjectType(expr.__element__)) {
      const lines = [];
      lines.push(
        `SELECT${
          expr.__expr__.__element__.__name__ === "std::FreeObject"
            ? ""
            : ` (${renderEdgeQL(expr.__scope__ ?? expr.__expr__, ctx, false)})`
        }`
      );

      lines.push(
        shapeToEdgeQL((expr.__element__.__shape__ || {}) as object, ctx)
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
        withBlock +
        lines.join(" ") +
        (modifiers.length ? "\n" + modifiers.join("\n") : "")
      );
    } else {
      // non-object/non-shape select expression
      return withBlock + `SELECT (${renderEdgeQL(expr.__expr__, ctx)})`;
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
      clause.push(`\nELSE (${renderEdgeQL($else, ctx, true, true)})`);
    }
    return `${renderEdgeQL(expr.__expr__, ctx, false, true)} ${clause.join(
      ""
    )}`;
  } else if (expr.__kind__ === ExpressionKind.Function) {
    const args = expr.__args__.map(
      arg => `(${renderEdgeQL(arg!, ctx, false)})`
    );
    for (const [key, arg] of Object.entries(expr.__namedargs__)) {
      args.push(`${q(key)} := (${renderEdgeQL(arg, ctx, false)})`);
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
          childExprs.push(
            ...walkExprTree(expr.__parent__.type, parentScope, ctx)
          );
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
      case ExpressionKind.Array:
        for (const subExpr of expr.__items__) {
          childExprs.push(...walkExprTree(subExpr, parentScope, ctx));
        }
        break;
      case ExpressionKind.Tuple:
        for (const subExpr of expr.__items__) {
          childExprs.push(...walkExprTree(subExpr, parentScope, ctx));
        }
        break;
      case ExpressionKind.NamedTuple:
        for (const subExpr of Object.values(expr.__shape__)) {
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
          childExprs.push(...walkExprTree(modifiers.offset!, expr, ctx));
        }
        if (modifiers.limit) {
          childExprs.push(...walkExprTree(modifiers.limit!, expr, ctx));
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

function literalToEdgeQL(type: BaseType, val: any): string {
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

// backtick quote identifiers if needed
// https://github.com/edgedb/edgedb/blob/master/edb/edgeql/quote.py
function q(ident: string, allowReserved: boolean = false): string {
  if (
    !ident ||
    ident.startsWith("@") ||
    ident.includes("::") ||
    ident.startsWith("<") // backlink
  ) {
    return ident;
  }

  const isAlphaNum = /^([^\W\d]\w*|([1-9]\d*|0))$/.test(ident);

  const lident = ident.toLowerCase();

  const isReserved =
    lident !== "__type__" &&
    lident !== "__std__" &&
    reservedKeywords.includes(lident);

  if (isAlphaNum && (allowReserved || !isReserved)) {
    return ident;
  }

  return "`" + ident.replace(/`/g, "``") + "`";
}

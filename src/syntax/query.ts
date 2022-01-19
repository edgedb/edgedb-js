import * as edgedb from "edgedb";
import {Cardinality, ExpressionRoot} from "../reflection";
import {jsonifyComplexParams} from "./params";

async function queryFunc(this: any, cxn: edgedb.Executor, args: any) {
  const _args = jsonifyComplexParams(this, args);
  if (
    this.__cardinality__ === Cardinality.One ||
    this.__cardinality__ === Cardinality.AtMostOne
  ) {
    return cxn.querySingle(this.toEdgeQL(), _args);
  } else {
    return cxn.query(this.toEdgeQL(), _args);
  }
}

export function $queryify<Expr extends ExpressionRoot>(expr: Expr) {
  return Object.assign(expr, {
    run: queryFunc.bind(expr),
  });
}

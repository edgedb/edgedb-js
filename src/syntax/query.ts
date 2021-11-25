import * as edgedb from "edgedb";
import {Cardinality, ExpressionRoot} from "../reflection";

async function queryFunc(this: any, cxn: edgedb.Executor, args: any) {
  if (
    this.__cardinality__ === Cardinality.One ||
    this.__cardinality__ === Cardinality.AtMostOne
  ) {
    return cxn.querySingle(this.toEdgeQL(), args);
  } else {
    return cxn.query(this.toEdgeQL(), args);
  }
}

export function $queryify<Expr extends ExpressionRoot>(expr: Expr) {
  return Object.assign(expr, {
    run: queryFunc.bind(expr),
  });
}

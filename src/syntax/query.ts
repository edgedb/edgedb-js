import * as edgedb from "edgedb";
import {Cardinality, ExpressionRoot} from "../reflection";

async function queryFunc(this: any, cxn: edgedb.Executor, args: any) {
  if (
    this.__cardinality__ === Cardinality.One ||
    this.__cardinality__ === Cardinality.AtMostOne
  ) {
    let result: any;
    try {
      result = await cxn.querySingle(this.toEdgeQL(), args);
    } catch (err) {
      if (err instanceof edgedb.NoDataError) {
        result = null;
      } else {
        throw err;
      }
    }
    return result;
  } else {
    return cxn.query(this.toEdgeQL(), args);
  }
}

export function $queryify<Expr extends ExpressionRoot>(expr: Expr) {
  return Object.assign(expr, {
    run: queryFunc.bind(expr),
  });
}

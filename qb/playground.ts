// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";
import {$} from "edgedb";
import {cardinalityUtil} from "edgedb/dist/reflection";

async function run() {
  const {client} = await setupTests();
  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);

  console.log(e.cast(e.str, e.set()).__cardinality__);
  const t1 = e.op(e.cast(e.str, e.set()), "??", "default");
  console.log(t1.__args__[1].__cardinality__);
  console.log(t1.__cardinality__);
  console.log(await t1.run(client));

  type asdf = cardinalityUtil.orCardinalities<
    $.Cardinality.Empty,
    $.Cardinality.One
  >;
  console.log(
    cardinalityUtil.orCardinalities($.Cardinality.Empty, $.Cardinality.One)
  );
  const query = e.op(e.cast(e.str, e.set()), "??", "default");
  e.op("value", "??", "default");
  e.op(e.cast(e.str, e.set()), "??", e.set("asdf", "default"));

  console.log(query.toEdgeQL());
  const result = await query.run(client);
  console.log(result);
}

run();

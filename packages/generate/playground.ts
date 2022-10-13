// tslint:disable:no-console
import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";
import type {SelectModifiers} from "./src/syntax/select";

// import type {SelectModifiers} from "./src/syntax/select";

type test = {arg: string} | {qwer: string; arg: string};

function infer<T extends test>(arg: T) {
  return arg;
}

async function run() {
  // type asdeeef = SelectModifiers<
  //   typeof e["Movie"]["__element__"]
  // >["filter_single"];
  const {client, data} = await setupTests();

  const query = e.select(e.Movie, () => ({
    filter_single: {
      id: data.the_avengers.id
    }
  }));

  console.log(query.toEdgeQL());

  const result = await query.run(client);

  console.log(result);
}

run();

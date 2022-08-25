// tslint:disable:no-console

// import {setupTests} from "./test/setupTeardown";
import {createClient} from "edgedb";

import e from "./dbschema/edgeql-js/index.ts";

try {
  const client = createClient();
  const query = e.select({
    num: e.int64(35),
    msg: e.str("Hello world"),
  });

  const result = await query.run(client);
  if (result.msg !== "Hello world" || result.num !== 35) {
    throw new Error();
  }
  console.log(result);
  console.log(`Success: --target deno`);
} catch (err) {
  console.log(err);
}

Deno.exit();
export {};

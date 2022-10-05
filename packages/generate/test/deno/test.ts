// tslint:disable:no-console

// import {setupTests} from "./test/setupTeardown";
import {createClient} from "edgedb";

import e from "./edgeql-js/index.ts";
import {freeShape} from "./queries.ts";

try {
  const client = createClient();
  const query = e.select({
    num: e.int64(35),
    msg: e.str("Hello world")
  });

  const result = await query.run(client);
  if (result.msg !== "Hello world" || result.num !== 35) {
    throw new Error();
  }

  const movies = await freeShape(client, {data: "sup"});
  if (movies.data !== "sup") {
    throw new Error("Failure: --deno");
  }

  console.log(`Success: --target deno`);
} catch (err) {
  console.log(err);
}

Deno.exit();
export {};

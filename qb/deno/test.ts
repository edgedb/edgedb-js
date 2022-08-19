// tslint:disable:no-console

// import {setupTests} from "./test/setupTeardown";
import {createClient} from "edgedb";
import e from "./edgeql-js/index.ts";

async function run() {
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

    console.log(`Success: --target mts`);
  } catch (err) {
    console.log(err);
    Deno.exit();
  }
}
run();
export {};

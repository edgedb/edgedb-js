import {createClient} from "edgedb";
import e from "./edgeql-js/index.mjs";

const client = createClient();

async function run() {
  try {
    const result = await e
      .select({
        num: e.int64(35),
        msg: e.str("sup"),
      })
      .run(client);
    if (result.num !== 35) throw new Error();
    if (result.msg !== "sup") throw new Error();
    console.log(`Success: --target esm`);
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
}

run();

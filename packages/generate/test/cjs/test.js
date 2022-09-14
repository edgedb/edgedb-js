// tslint:disable:no-console

// import {setupTests} from "./test/setupTeardown";
const {createClient} = require("edgedb");
const e = require("./edgeql-js").default;

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

    console.log(`Success: --target cjs`);
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
}

run();

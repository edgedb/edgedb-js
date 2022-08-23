import path from "path";
import {execSync} from "child_process";
import {createClient} from "edgedb";
import e from "./edgeql-js/index.mjs";

const client = createClient();

async function run() {
  try {
    const result = await e.str("Hello world!").run(client);
    if (result !== "Hello world!") throw new Error();
    console.log(`Success: --target esm`);
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
}

run();

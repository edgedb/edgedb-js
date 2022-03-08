// tslint:disable:no-console
import * as edgedb from "edgedb";
import {setupTests} from "./test/setupTeardown";
import e, {InsertShape} from "./dbschema/edgeql-js";

export namespace $default {
  export const sadf = "asdf";
}

async function run() {
  const {client} = await setupTests();

  const iq = e.insert(e.Profile, {
    slug: "movieslug",
    plot_summary: "Stuff happens.",
  });

  const qq = e.select(iq, () => ({
    slug: true,
    plot_summary: true,
  }));

  console.log(qq.toEdgeQL());

  const result = await qq.run(client);
  console.log(JSON.stringify(result, null, 2));
}

run();
export {};

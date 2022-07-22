// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";
import {LocalDateTime} from "edgedb";

async function run() {
  const {client} = await setupTests();

  const dateString = new Date().toISOString();
  console.log((await e.datetime(dateString).run(client)).toISOString());

  console.log(await e.int64("1234123").run(client));
  console.log(await e.cal.local_datetime("1999-03-31T15:17:00").run(client));
  console.log(await e.cal.local_date("1999-03-31").run(client));
  console.log(await e.cal.local_time("15:17:00").run(client));
  console.log(await e.duration("5 hours").run(client));
  console.log(await e.cal.relative_duration("4 weeks 5 hours").run(client));
  console.log(await e.cal.date_duration("4 months 5 days").run(client));

  const query = e.cast(e.int64, "7199254740991");
  const result = await query.run(client);
  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
  console.log(query.toEdgeQL());
  console.log(result);
}

run();

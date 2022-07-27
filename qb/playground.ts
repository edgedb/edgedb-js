// tslint:disable:no-console

import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";

async function run() {
  const {client} = await setupTests();
  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~`);

  const queries = [
    e.str("i ❤️ edgedb"),
    e.str("hello there!"),
    e.bool(false),
    e.float64(3.14),
    e.bigint(BigInt(12345678)),
    // e.decimal("1234.4567"),
    e.uuid("a5ea6360-75bd-4c20-b69c-8f317b0d2857"),
    e.datetime("1999-03-31T15:17:00Z"),
    e.duration("5 hours 4 minutes 3 seconds"),
    e.cal.relative_duration("2 years 18 days"),
    e.bytes(Buffer.from("bina\\x01ry")),
    e.array(["hello", "world"]),
    e.tuple(["Apple", 7, true]),
    e.tuple({fruit: "Apple", quantity: 3.14, fresh: true}),
    e.json(["this", "is", "an", "array"]),
  ];

  for (const query of queries) {
    console.log(query.toEdgeQL());
    const result = await query.run(client);
    console.log(result);
  }
}

run();

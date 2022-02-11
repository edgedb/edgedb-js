#!/usr/bin/env node

console.log(
  `Failure: "edgedb" package is not installed.

To generate the EdgeDB query builder, you must have
the \`edgedb\` package installed as a dependency in
your local project:

With npm:      npm install edgedb
With yarn:     yarn add edgedb

Then run \`npx edgeql-js\` again.`
);

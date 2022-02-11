#!/usr/bin/env node

console.log(
  `Failure: must install edgedb module.

To generate the EdgeDB query builder, you must have
the \`edgedb\` package installed as a dependency in
your local project:

With npm:      npm install edgedb
With yarn:     yarn add edgedb

Then run \`yarn edgeql-js\` again.`
);

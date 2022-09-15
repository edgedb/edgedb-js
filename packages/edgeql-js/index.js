#!/usr/bin/env node

console.log(
  `Failure: The \`npx edgeql-js\` command is no longer supported.

To generate the EdgeDB query builder, install \`@edgedb/generate\`
as a dev dependency in your local project:

  $ npm install -D @edgedb/generate     (npm)
  $ yarn add -dev @edgedb/generate      (yarn)

Then run the following command.

  $ npx @edgedb/generate edgeql-js
`
);

#!/usr/bin/env node

console.log(
  `Failure: The \`npx edgeql-js\` command is no longer supported.

To generate the EdgeDB query builder, install \`@edgedb/generate\`
package as a dev dependency in your local project. This package implements
a set of code generators for EdgeDB (including the query builder).

  $ npm install -D @edgedb/generate      (npm)
  $ yarn add -D @edgedb/generate         (yarn)

Then run the following command to generate the query builder.

  $ npx @edgedb/generate edgeql-js
`
);

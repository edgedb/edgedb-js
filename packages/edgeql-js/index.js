#!/usr/bin/env node

console.log(
  `Failure: The \`npx edgeql-js\` command is no longer supported.

To generate the Gel query builder, install \`@gel/generate\`
package as a dev dependency in your local project. This package implements
a set of code generators for Gel (including the query builder).

  $ npm install -D @gel/generate      (npm)
  $ yarn add -D @gel/generate         (yarn)

Then run the following command to generate the query builder.

  $ npx @gel/generate edgeql-js
`,
);

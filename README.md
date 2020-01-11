# The NodeJS driver for EdgeDB

[![Build Status](https://github.com/edgedb/edgedb-js/workflows/Tests/badge.svg?event=push&branch=master)](https://github.com/edgedb/edgedb-js/actions) [![NPM](https://img.shields.io/npm/v/edgedb)](https://www.npmjs.com/package/edgedb) [![Join the community on Spectrum](https://img.shields.io/badge/join%20the%20community-on%20spectrum-blueviolet)](https://spectrum.chat/edgedb)

**edgedb** is the official [EdgeDB](https://github.com/edgedb/edgedb) driver
for JavaScript and TypeScript.

The library requires NodeJS 10 or later.

## Installation

```
npm install edgedb --save
```

or

```
yarn add edgedb --save
```

## Quick Start

Follow the [EdgeDB tutorial](https://edgedb.com/docs/tutorial/index)
to get EdgeDB installed and minimally configured.

Next, create the `package.json` file:

```
mkdir myproject
cd myproject
npm init
```

Next, install the "edgedb" library:

```
npm install edgedb --save
```

And here's a simple script to connect to an EdgeDB instance and
run a simple query:

```js
const edgedb = require("edgedb");

async function main() {
  const conn = await edgedb.connect({
    user: "edgedb",
    host: "127.0.0.1",
  });

  console.log(await conn.fetchOne("SELECT 1 + 1"));

  await conn.close();
}

main();
```

## Development

We use yarn to develop edgedb-js.

Instructions for installing EdgeDB and edgedb-js locally can be found
[here](https://edgedb.com/docs/internals/dev/).

To run the test suite, run `yarn test`.

## License

edgedb-js is developed and distributed under the Apache 2.0 license.

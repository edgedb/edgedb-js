# The NodeJS driver for EdgeDB

[![Build Status](https://github.com/edgedb/edgedb-js/workflows/Tests/badge.svg?event=push&branch=master)](https://github.com/edgedb/edgedb-js/actions) [![NPM](https://img.shields.io/npm/v/edgedb)](https://www.npmjs.com/package/edgedb) [![Join GitHub discussions](https://img.shields.io/badge/join-github%20discussions-green)](https://github.com/edgedb/edgedb/discussions)

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

A local installation of EdgeDB is required to run tests. Download
EdgeDB from [here](https://edgedb.com/download) or
[build it manually](https://edgedb.com/docs/internals/dev/).

We use TypeScript, yarn, prettier, and tslint to develop edgedb-js.
To run the test suite, run `yarn test`. To lint or format the code, run
`yarn lint` / `yarn format`.

## License

edgedb-js is developed and distributed under the Apache 2.0 license.

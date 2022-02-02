# The official Node.js client library for EdgeDB

[![Build Status](https://github.com/edgedb/edgedb-js/workflows/Tests/badge.svg?event=push&branch=master)](https://github.com/edgedb/edgedb-js/actions) [![NPM](https://img.shields.io/npm/v/edgedb)](https://www.npmjs.com/package/edgedb) [![Join GitHub discussions](https://img.shields.io/badge/join-github%20discussions-green)](https://github.com/edgedb/edgedb/discussions)

**edgedb** is the official [EdgeDB](https://github.com/edgedb/edgedb) driver
for JavaScript and TypeScript.

The library requires NodeJS 10 or later.

## Installation

```bash
npm install edgedb
# or
yarn add edgedb
```

## Quickstart

First, go through the
[EdgeDB Quickstart](https://www.edgedb.com/docs/quickstart) to install EdgeDB
and set up your first EdgeDB project.

Now in your project directory, install the "edgedb" library:

```bash
npm init

npm install edgedb
```

And here's a simple script to connect to your EdgeDB instance and
run a simple query:

```js
const edgedb = require("edgedb");

async function main() {
  const client = edgedb.createClient();

  console.log(
    await client.querySingle(
      `SELECT re_replace('World', 'EdgeDB', 'Hello World!')`
    )
  );
}

main();
```

## Development

A local installation of EdgeDB is required to run tests. Download
EdgeDB from [here](https://www.edgedb.com/download) or
[build it manually](https://www.edgedb.com/docs/reference/dev).

```bash
$ git clone git@github.com:edgedb/edgedb-js.git
$ cd edgedb-js
$ yarn              # install dependencies
$ yarn build        # compile TypeScript
$ yarn tests        # run tests
```

## License

edgedb-js is developed and distributed under the Apache 2.0 license.

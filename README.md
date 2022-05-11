<div align="center">
  <h1>The official Node.js client library for EdgeDB</h1>

  <a href="https://github.com/edgedb/edgedb-js/actions" rel="nofollow">
    <img src="https://github.com/edgedb/edgedb-js/actions/workflows/tests.yml/badge.svg?event=push&branch=master" alt="Build status">
  </a>
  <a href="https://www.npmjs.com/package/edgedb" rel="nofollow">
    <img src="https://img.shields.io/npm/v/edgedb" alt="NPM version">
  </a>
  <a href="https://github.com/edgedb/edgedb" rel="nofollow">
    <img src="https://img.shields.io/github/stars/edgedb/edgedb" alt="Stars">
  </a>
  <a href="https://github.com/edgedb/edgedb/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/license-Apache%202.0-blue" />
  </a>
  <br />
  <br />
  <a href="https://www.edgedb.com/docs/guides/quickstart">Quickstart</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://www.edgedb.com">Website</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://www.edgedb.com/docs/clients/01_js/index">Docs</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://discord.gg/umUueND6ag">Discord</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://twitter.com/edgedatabase">Twitter</a>
  <br />

</div>

<br />
<br />

This is the official [EdgeDB](https://github.com/edgedb/edgedb) client library
for JavaScript and TypeScript.

If you're just getting started with EdgeDB, we recommend going through the
[EdgeDB Quickstart](https://www.edgedb.com/docs/quickstart) first. This walks
you through the process of installing EdgeDB, creating a simple schema, and
writing some simple queries.

### Requirements

- Node.js 12+
- _TypeScript only_
  - TypeScript 4.4+
  - `yarn add @types/node`

### Installation

```bash
npm install edgedb      # npm users
yarn add edgedb         # yarn users
```

## Basic usage

> The examples below demonstrate only the most fundamental use cases for this
> library. **[Go to the complete documentation site. >](https://www.edgedb.com/docs/clients/01_js/index)**

### Create a client

A _client_ is an instance of the `Client` class, which maintains a pool of
connections to your database and provides methods for executing queries.

_For TypeScript (and Node.js+ESM)_

```ts
import * as edgedb from "edgedb";

const client = edgedb.createClient();
```

_For Node.js (CommonJS)_

```js
const edgedb = require("edgedb");

const client = edgedb.createClient();
```

### Configuring the connection

The call to `edgedb.createClient()` doesn't require arguments, as the library
can determine how to connect to your database using the following mechanisms.

1. _For local development_: initialize a project with the `edgedb project init`
   command. As long as the file is within a project directory, `createClient`
   will be able to auto-discover the connection information of the project's
   associated instance. For more information on projects, follow the
   [Using projects](https://www.edgedb.com/docs/guides/projects) guide.

2. _In production_: configure the connection using **environment variables**.
   (This can also be used during local development if you prefer.) The easiest
   way is to set the `EDGEDB_DSN` variable; a DSN (also known as a "connection
   string") is a string of the form
   `edgedb://USERNAME:PASSWORD@HOSTNAME:PORT/DATABASE`.

For advanced cases, see the
[DSN specification](https://www.edgedb.com/docs/reference/dsn) and
[Reference > Connection Parameters](https://www.edgedb.com/docs/reference/connection).

### Run a query

> The remainder of the documentation assumes you are using ES module (`import`)
> syntax.

```ts
import * as edgedb from "edgedb";

const client = edgedb.createClient();
await client.query("select 2 + 2"); // => [4]
```

Note that the result is an _array_. The `.query()` method always returns an
array, regardless of the result cardinality of your query. If your query
returns _zero or one elements_, use the `.querySingle()` instead.

```ts
// empty set, zero elements
await client.querySingle("select <str>{}"); // => null

// one element
await client.querySingle("select 2 + 2"); // => 4

// one element
await client.querySingle(
  `select Movie { title }
  filter .id = <uuid>'2eb3bc76-a014-45dc-af66-2e6e8cc23e7e';`
); // => { title: "Dune" }
```

## Query builder

Instead of writing queries as strings, you can use this package to generate a
_query builder_. The query builder lets you write queries in a code-first way
and automatically infers the return type of your queries.

To generate the query builder, install the `edgedb`, initialize a project (if
you haven't already), then run the following command:

```sh
$ npx edgeql-js
```

This will generate an EdgeQL query builder into the `"./dbschema/edgeql-js`
directory, as defined relative to your project root.

For details on using the query builder, refer to the [complete documentation](https://www.edgedb.com/docs/clients/01_js/generation). Below is a simple
`select` query as an example.

```ts
import {createClient} from "edgedb";
import e from "./dbschema/edgeql-js";

const client = createClient();
const query = e.select(e.Movie, movie => ({
  id: true,
  title: true,
  actors: { name: true },
  num_actors: e.count(movie.actors)
  filter: e.op(movie.title, '=', 'Dune')
}));

const result = await query.run(client);
result.actors[0].name; // => Timothee Chalamet
```

For details on using the query builder, refer to the full [Query builder docs]
(https://www.edgedb.com/docs/clients/01_js/querybuilder).

## Contribute

Contributing to this library requires a local installation of EdgeDB. Install
EdgeDB from [here](https://www.edgedb.com/download) or
[build it from source](https://www.edgedb.com/docs/reference/dev).

```bash
$ git clone git@github.com:edgedb/edgedb-js.git
$ cd edgedb-js
$ yarn              # install dependencies
$ yarn build        # compile TypeScript
$ yarn tests        # run tests
```

## License

edgedb-js is developed and distributed under the Apache 2.0 license.

.. _edgedb-js-intro:

===========================
EdgeDB TypeScript/JS Client
===========================

.. toctree::
   :maxdepth: 3
   :hidden:

   driver
   querybuilder
   generation
   literals
   types
   funcops
   parameters
   objects
   select
   insert
   update
   delete
   with
   for
   group
   reference

This is the official EdgeDB client library for JavaScript and TypeScript. It's
the easiest way to connect to your database and execute queries from a Node.js
or Deno backend.



.. _edgedb-js-installation:

**Installation**

To get started, install the ``edgedb`` module from NPM.

.. code-block:: bash

    $ npm install edgedb      # npm users
    $ yarn add edgedb         # yarn users

There are two components of this library:

- Use the *driver* to establish a connection to your database and execute
  EdgeQL queries (written as strings).
- Use the *query builder* to write queries in a code-first, typesafe way.
  Recommended for TypeScript users.


Migration to 2.0
================

We recently released ``v0.21.0`` of the ``edgedb`` module on NPM and
``deno.land/x``, which supports the latest EdgeDB 2.0 features and protocol.
It is also backwards-compatible with v1 instances as well, so we recommend
all users upgrade.

```bash
npm install edgedb@latest
```

Breaking changes
----------------

- All ``uuid`` properties are now decoded to include hyphens. Previously
  hyphens were elided for performance reasons; this issue has since been
  resolved.

  .. code-block:: typescript

    client.querySingle(`select uuid_generate_v1mc();`);
    // "ce13b17a-7fcd-42b3-b5e3-eb28d1b953f6"


- All ``json`` properties and parameters are now parsed/stringified internally
  by the client. Previously:

  .. code-block:: typescript

    const result = await client.querySingle(
      `select to_json('{"hello": "world"}');`
    );
    result; // '{"hello": "world"}'
    typeof result; // string


  Now:

  .. code-block:: typescript

    const result = await client.querySingle(
      `select to_json('{"hello": "world"}');`
    );
    result; // {hello: "world"}
    typeof result; // object
    result.hello; // "world"


New features
------------

- Added the ``.withGlobals`` method the ``Client`` for setting :ref:`global
  variables <ref_datamodel_globals>`

  .. code-block:: typescript

    import {createClient} from "edgedb";
    const client = createClient().withGlobals({
      current_user: getUserIdFromCookie(),
    });

    client.query(`select User { email } filter .id = global current_user;`);


- Support for globals in the query builder

  .. code-block:: typescript

    const query = e.select(e.User, user => ({
      email: true,
      filter: e.op(user.id, '=', e.global.current_user)
    }));

    await query.run(client);

- Support for the ``group`` statement. :ref:`Documentation
  <ref_datamodel_globals>`

  .. code-block:: typescript

    e.group(e.Movie, movie => {
      return {
        title: true,
        actors: {name: true},
        num_actors: e.count(movie.characters),
        by: {release_year: movie.release_year},
      };
    });
    /* [
      {
        key: {release_year: 2008},
        grouping: ["release_year"],
        elements: [{
          title: "Iron Man",
          actors: [...],
          num_actors: 5
        }, {
          title: "The Incredible Hulk",
          actors: [...],
          num_actors: 3
        }]
      },
      // ...
    ] */


- Support for :ref:`range types <ref_datamodel_ranges>` and
  :eql:type:`cal::date_duration` values.


The driver
==========

The driver implements the core functionality required to establish a
connection to your database and execute queries. If you prefer writing queries
as strings, the driver API is all you need.

.. code-block:: javascript

  const edgedb = require("edgedb");

  const client = edgedb.createClient();
  const query = `select "Hello world!";`;

  async function run(){
    const result = await client.query(query)
    console.log(result); // "Hello world!"
  }

  run();

If you're not using TypeScript, you can skip straight to :ref:`the Driver docs
<edgedb-js-examples>`.


.. _edgedb-js-qb:

The query builder
=================

The EdgeDB query builder provides a **code-first** way to write
**fully-typed** EdgeQL queries with TypeScript. We recommend it for TypeScript
users and JavaScript users who prefer writing queries as code.

.. code-block:: typescript

  import e from "./dbschema/edgeql-js"; // auto-generated code

  const query = e.select(e.Movie, (movie)=>({
    id: true,
    title: true,
    actors: { name: true },
    filter: e.op(movie.title, '=', 'Dune')
  }));

  const result = await query.run(client);
  // { id: string; title: string; actors: {name: string}[] }
  // property `title` is exclusive

  console.log(result.actors[0].name);
  // => Timothee Chalamet



.. note:: Is it an ORM?

  No—it's better! Like any modern TypeScript ORM, the query builder gives you
  full typesafety and autocompletion, but without the power and `performance
  <https://github.com/edgedb/imdbench>`_
  tradeoffs. You have access to the **full power** of EdgeQL and can write
  EdgeQL queries of arbitrary complexity. And since EdgeDB compiles each
  EdgeQL query into a single, highly-optimized SQL query, your queries stay
  fast, even when they're complex.


How do I get started?
---------------------

We recommend reading the :ref:`Driver docs <edgedb-js-examples>` first. If you
are happy writing your EdgeQL as plain strings, then that's all you need! If
you're a TypeScript user, or simply prefer writing queries in a code-first
way, continue on to the :ref:`Query builder <edgedb-js-generation>` docs.

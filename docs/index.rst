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

.. note::

  We recently released ``v0.21.0`` of the ``edgedb`` module on NPM and
  ``deno.land/x``, which supports the latest EdgeDB 2.0 features and protocol.
  It is also backwards-compatible with v1 instances as well, so we recommend
  all users upgrade. Read the `release notes
  <https://github.com/edgedb/edgedb-js/releases/tag/v0.21.0>`_ for details.

There are two components of this library:

- Use the :ref:`Driver API <edgedb-js-intro-driver>` to establish a connection
  to your database and execute EdgeQL queries (written as strings).
- Use the :ref:`Query Builder API <edgedb-js-intro-qb>` to write queries in a
  code-first, typesafe way. Recommended for TypeScript users.


.. _edgedb-js-installation:

**Requirements**

*Node.js users*

- [Node only] Node.js 14+. Run ``node --version`` to see your current version
- [Deno only] Deno v1.17+. Run ``deno --version`` to see your current version
- [TypeScript only] Node.js type declarations: ``npm install @types/node``
- [TypeScript only] ``"strict": true`` in ``tsconfig.json`` ``compilerOptions``

**Installation**

*Node users*: Install the ``edgedb`` module from NPM.

.. code-block:: bash

    $ npm install edgedb      # npm users
    $ yarn add edgedb         # yarn users

Deno users: Import from ``deno.land/x/edgedb``:

.. code-block::

  import * as edgedb from "https://deno.land/x/edgedb/mod.ts"

.. _edgedb-js-intro-driver:

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
<edgedb-js-driver>`.


.. _edgedb-js-intro-qb:

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

We recommend reading the :ref:`Driver docs <edgedb-js-driver>` first. If you
are happy writing your EdgeQL as plain strings, then that's all you need! If
you're a TypeScript user, or simply prefer writing queries in a code-first
way, continue on to the :ref:`Query builder <edgedb-js-generation>` docs.

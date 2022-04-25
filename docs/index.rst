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
   expressions
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

- Use the *driver* establishes a connection to your database and executes queries.
- Use the *query builder* to write queries in a code-first, typesafe way (if you wish)

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

  const query = e.select(e.Movie, ()=>({
    id: true,
    title: true,
    actors: { name: true }
  }));

  const result = await query.run(client)
  // { id: string; title: string; actors: {name: string}[] }[]


.. note:: Is it an ORM?

  No—it's better! Like any modern TypeScript ORM, the query builder gives you
  full typesafety and autocompletion, but without the power and `performance <https://github.com/edgedb/imdbench>`_
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

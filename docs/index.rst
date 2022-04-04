.. _edgedb-js-intro:

===========================
EdgeDB TypeScript/JS Client
===========================

.. toctree::
   :maxdepth: 3
   :hidden:

   driver
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

There are two components of this library: the *driver* and the *query builder*.

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
users—it's awesome.

.. code-block:: typescript

  import edgedb from "edgedb";
  import e from "./dbschema/edgeql-js"; // auto-generated code

  const client = edgedb.createClient();

  async function run(){
    const query = e.str("Hello world!");
    const result = await query.run(client)
    console.log(result); // "Hello world!"
  }

  run()

As you can see, you still use the ``edgedb`` module to instantiate a client,
but you use the auto-generated query builder to write and execute your queries.

Why use the query builder?
--------------------------

*Type inference!* If you're using TypeScript, the result type of *all
queries* is automatically inferred for you. For the first time, you don't
need an ORM to write strongly typed queries.

.. code-block:: typescript

  const client = edgedb.createClient();

  const q1 = await e.select("Hello world!").run(client);
  // string

  const q2 = await e.set(1, 2, 3).run(client);
  // number[]

  const q3 = e.select(e.Movie, () => ({
    id: true,
    name: true
  }));
  // {id:string; name: string}[]


*Auto-completion!* You can write queries full autocompletion on EdgeQL
keywords, standard library functions, and link/property names.

*Type checking!* In the vast majority of cases, the query builder won't let
you construct invalid queries. This eliminates an entire class of bugs and
helps you write valid queries the first time.


Is it an ORM?
-------------

Nope. There's no "object-relational mapping" happening here—that's all handled
by EdgeDB itself.

The query builder itself is a comparatively thin wrapper over EdgeQL. We've
designed the API such that the TypeScript representation of a query is
structurally similar to the equivalent EdgeQL.

.. code-block:: edgeql

  select Movie {
    id,
    title,
    uppercase_title := str_upper(.title)
  }
  filter .title = "Iron Man"

.. code-block:: typescript

  e.select(e.Movie, movie => ({
    id: true,
    title: true,
    uppercase_title: e.str_upper(movie.title),
    filter: e.op(movie.title, '=', 'Iron Man')
  }));

More importantly, it gives you access to the **full power** of EdgeQL! The
query builder can represent EdgeQL queries of arbitrary complexity.

By comparison, SQL-based ORMs are limited in what they can represent. Things
like computed properties, SQL's large standard library of functions,
aggregations, transactions, and subqueries are rarely possible. But even for
the simple stuff, we think the query builder API is more readable, compact,
and intuitive than any ORM on the market.

How do I get started?
---------------------

The query builder not an alternative to the driver; the driver API is still
needed to initialize a database client. We recommend reading the :ref:`Driver
docs <edgedb-js-examples>` first, then continuing on to the :ref:`Query
builder <edgedb-js-generation>` docs.

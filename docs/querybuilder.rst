=============
Query Builder
=============

The EdgeDB query builder provides a **code-first** way to write
**fully-typed** EdgeQL queries with TypeScript. We recommend it for TypeScript
users, or anyone who prefers writing queries with code.

.. code-block:: typescript

  const query = e.select(e.Movie, ()=>({
    id: true,
    title: true,
    actors: { name: true }
  }));

  const result = await query.run(client)
  // { id: string; title: string; actors: {name: string}[] }[]

Why use the query builder?
--------------------------

*Type inference!* If you're using TypeScript, the result type of *all
queries* is automatically inferred for you. For the first time, you don't
need an ORM to write strongly typed queries.

*Auto-completion!* You can write queries full autocompletion on EdgeQL
keywords, standard library functions, and link/property names.

*Type checking!* In the vast majority of cases, the query builder won't let
you construct invalid queries. This eliminates an entire class of bugs and
helps you write valid queries the first time.


Getting started
---------------

Initialize a project
^^^^^^^^^^^^^^^^^^^^

If you haven't already, initialize a project, write your schema, and create/
apply a migration. Follow the :ref:`Quickstart <ref_quickstart>` for a guided
walkthrough of this process.

The rest of this walkthrough uses the following simple Movie schema:

.. code-block:: sdl

  type Movie {
    required property title -> str { constraint exclusive; };
    property release_year -> int64;
    multi link actors -> Person;
  }

  type Person {
    required property name -> str;
  }


Generate the query builder
^^^^^^^^^^^^^^^^^^^^^^^^^^

Use ``npx`` to generate the query builder.

.. code-block:: bash

  $ npx edgeql-js

This detects whether you're using TypeScript or JavaScript and generates the
appropriate files into the ``dbschema/edgeql-js`` directory. Refer to the
:ref:`Targets <edgedb_qb_target>` section to learn how to customize this.

.. note::

  If you're seeing a connection error or another issue, refer to the
  :ref:`Generation <edgedb-js-generation>` docs for more complete
  documentation, then return to this tutorial.

The first time you generate the query builder you'll be prompted to add the
generated files to your ``.gitignore``. Confirm this prompt to
add the the line automatically.

$ npx edgeql-js
  ...
  Checking the generated query builder into version control
  is NOT RECOMMENDED. Would you like to update .gitignore to ignore
  the query builder directory? The following line will be added:

    dbschema/edgeql-js

  [y/n] (leave blank for "y")


Import the query builder
^^^^^^^^^^^^^^^^^^^^^^^^
Create a TypeScript file called ``script.ts`` (the name doesn't matter) and
import the query builder like so:

.. code-block:: typescript

  // script.ts
  import e from "./dbschema/edgeql-js";

Create a client
^^^^^^^^^^^^^^^

The query builder is only used to *write* queries, not execute them. To
execute queries, we still need a *client* that manages the actual connection
to our EdgeDB instance.

.. code-block:: typescript-diff

    // script.ts
  + import {createClient} from "edgedb";
    import e from "./dbschema/edgeql-js";

  + const client = createClient();


If you've initialized a project, there's no need to provide connection
information to ``createClient``—it will connect to your project-linked
instance by default. You can override this by setting the value of the
``EDGEDB_DSN`` environment variable; refer to the :ref:`Connection docs
<edgedb_client_connection>` for more information.

Write a query
^^^^^^^^^^^^^

Now we have everything we need to write our first query!

.. code-block:: typescript-diff

    // script.ts
    import {createClient} from "edgedb";
    import e from "./dbschema/edgeql-js";

    const client = createClient();

  + async function run() {
  +   const query = e.select(e.datetime_current());
  +   const result = await query.run(client);
  +   console.log(result);
  + }
  + run();

We use the ``e`` object to construct queries. The goal of the query builder is
to provide an API that is as close as possible to EdgeQL itself. So
``select datetime_current()`` becomes ``e.select(e.datetime_current()``. This
query is then executed with the ``.run()`` method which accepts a *client* as
it's first input.

Run that script with the ``esbuild-runner`` like so. It should print the
current timestamp (as computed by the database).

.. code-block:: bash

  $ npx esbuild-runner script.ts
  2022-05-10T03:11:27.205Z

.. _edgedb-js-execution:

Expressions
-----------

The ``e`` variable provides everything you need to build any EdgeQL query. All
EdgeQL commands, standard library functions, and types are available as
properties on ``e``.

.. code-block:: typescript

  import e from "./dbschema/edgeql-js";

  // commands
  e.select;
  e.insert;
  e.update;
  e.delete;

  // types
  e.str;
  e.bool;
  e.cal.local_date;
  e.Movie;

  // functions
  e.str_upper;
  e.len;
  e.count;
  e.math.stddev;

These building blocks are used to define *expressions*. Everything you create
using the query builder is an expression. Expressions have a few things in
common.

Expressions produce EdgeQL
^^^^^^^^^^^^^^^^^^^^^^^^^^

You can extract an EdgeQL representation of any expression calling the
``.toEdgeQL()`` method. Below is a number of expressions and the EdgeQL they
produce. (The actual EdgeQL the create may look slightly different, but it's
equivalent.)

.. code-block:: typescript

  e.str("Hello world!").toEdgeQL();
  // "Hello world"

  e.set(1, 2, 3).toEdgeQL();
  // {1, 2, 3}

  e.count(e.Movie).toEdgeQL();
  // count(Movie)

  e.insert(e.Movie, { title: "Iron Man "}).toEdgeQL();
  // insert Movie { title := "Iron Man" }

  e.select(e.Movie, () => ({ id: true, title: true })).toEdgeQL();
  // select Movie { id, title }

Type inference
^^^^^^^^^^^^^^

The query builder *automatically infers* the TypeScript type that best represents the result of a given expression. This inferred type can be extracted with the ``$infer`` helper.

.. code-block:: typescript

  import e, {$infer} from "./dbschema/edgeql-js";

  const query = e.select(e.Movie, () => ({ id: true, title: true }));
  type result = $infer<typeof query>;
  // {id: string; title: string}[]

Expressions are runnable
^^^^^^^^^^^^^^^^^^^^^^^^

Expressions can be executed with the ``.run()`` method, which accepts a
``client``.

.. code-block:: typescript

  import * as edgedb from "edgedb";

  const client = edgedb.createClient();
  const myQuery = e.select(e.Movie, () => ({
    id: true,
    title: true
  }));

  const result = await myQuery.run(client)
  // => [{ id: "abc...", title: "The Avengers" }, ...]

Note that the ``.run`` method accepts an instance of :js:class:`Client` (or
``Transaction``) as it's first argument. See :ref:`Creating a Client
<edgedb-js-create-client>` for details on creating clients. The second
argument is for passing :ref:`$parameters <edgedb-js-parameters>`, more on
that later.

.. code-block:: typescript

  .run(client: Client | Transaction, params: Params): Promise<T>


**JSON serialization**

You can also use the ``runJSON`` method to retrieve the query results as a serialized JSON-formatted *string*. This serialization happens inside the database and is much faster than calling ``JSON.stringify``.

.. code-block:: typescript

  const myQuery = e.select(e.Movie, () => ({
    id: true,
    title: true
  }));
  const result = await myQuery.runJSON(client);
  // => '[{ "id": "abc...", "title": "The Avengers" }, ...]'


Cheatsheet
----------

Below is a set of examples to get you started with the query builder. It is
not intended to be comprehensive, but it should provide a good starting point.

.. note::

  Modify the examples below to fit your schema, paste them into ``script.ts``,
  and execute them with the ``npx`` command from the previous section! Note
  how the signature of ``result`` changes as you modify the query.

Insert an object
^^^^^^^^^^^^^^^^

.. code-block:: typescript

  const query = e.insert(e.Movie, {
    title: 'Doctor Strange 2',
    release_year: 2022
  });

  const result = await query.run(client);
  // {id: string}
  // by default INSERT only returns
  // the id of the new object


Select objects
^^^^^^^^^^^^^^

.. code-block:: typescript

  const query = e.select(e.Movie, () => ({
    id: true,
    title: true,
  }));

  const result = await query.run(client);
  // Array<{id: string; title: string}>

To select all properties of an object, use the spread operator with the
special ``*`` property:

.. code-block:: typescript

  const query = e.select(e.Movie, () => ({
    ...e.Movie['*']
  }));

  const result = await query.run(client);
  /* Array{
    id: string;
    title: string;
    release_year: number | null;  # optional property
  }> */

Nested shapes
^^^^^^^^^^^^^

.. code-block:: typescript

  const query = e.select(e.Movie, () => ({
    id: true,
    title: true,
    actors: {
      name: true,
    }
  }));

  const result = await query.run(client);
  // Array<{id: string; title: string, actors: Array<{name: string}>}>

Filtering, ordering, and pagination
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The special keys ``filter``, ``order_by``, ``limit``, and ``offset``
correspond to equivalent EdgeQL clauses.

.. code-block:: typescript

  const query = e.select(e.Movie, (movie) => ({
    id: true,
    title: true,
    filter: e.op(movie.release_year, ">", 1999),
    order_by: movie.title,
    limit: 10,
    offset: 10
  }));

  const result = await query.run(client);
  // Array<{id: string; title: number}>

Operators
^^^^^^^^^

Note that the filter expression above uses ``e.op`` function, which is how to use *operators* like ``=``, ``>=``, ``++``, and ``and``.

.. code-block:: typescript

  // prefix (unary) operators
  e.op('not', e.bool(true));      // not true
  e.op('exists', e.set('hi'));    // exists {'hi'}

  // infix (binary) operators
  e.op(e.int64(2), '+', e.int64(2)); // 2 + 2
  e.op(e.str('Hello '), '++', e.str('World!')); // 'Hello ' ++ 'World!'

  // ternary operator (if/else)
  e.op(e.str('😄'), 'if', e.bool(true), 'else', e.str('😢'));
  // '😄' if true else '😢'

Select a single object
^^^^^^^^^^^^^^^^^^^^^^

Filter by a property with an *exclusive constraint* to fetch a particular
object.

.. code-block:: typescript

  const query = e.select(e.Movie, (movie) => ({
    id: true,
    title: true,
    release_year: true,

    // filter .id = '2053a8b4-49b1-437a-84c8-e1b0291ccd9f'
    filter: e.op(movie.id, '=', '2053a8b4-49b1-437a-84c8-e1b0291ccd9f'),
  }));

  const result = await query.run(client);
  // {id: string; title: string; release_year: number | null}

Note that ``result`` is now a single object, not a list of objects. The query
builder detects when you are filtering on a property with an exclusive
constraint.

Update objects
^^^^^^^^^^^^^^

.. code-block:: typescript

  const query = e.update(e.Movie, (movie) => ({
    filter: e.op(movie.title, '=', 'Doctor Strange 2'),
    set: {
      title: 'Doctor Strange in the Multiverse of Madness',
    },
  }));

  const result = await query.run(client);

Delete objects
^^^^^^^^^^^^^^

.. code-block:: typescript

  const query = e.delete(e.Movie, (movie) => ({
    filter: e.op(movie.title, 'ilike', "the avengers%"),
  }));

  const result = await query.run(client);
  // Array<{id: string}>

Compose queries
^^^^^^^^^^^^^^^

All query expressions are fully composable; this is one of the major
differentiators between this query builder and a typical ORM. For instance, we
can ``select`` an ``insert`` query in order to fetch properties of the object
we just inserted.

.. code-block:: typescript

  const newMovie = e.insert(e.Movie, {
    title: "Iron Man",
    release_year: 2008
  });

  const query = e.select(newMovie, ()=>({
    title: true,
    release_year: true,
    num_actors: e.count(newMovie.actors)
  }));

  const result = await query.run(client);
  // {title: string; release_year: number; num_actors: number}

Or we can use subqueries inside mutations.

.. code-block:: typescript

  // select Doctor Strange
  const drStrange = e.select(e.Movie, movie => ({
    filter: e.op(movie.title, '=', "Doctor Strange")
  }));

  // select actors
  const actors = e.select(e.Person, person => ({
    filter: e.op(person.name, 'in', e.set('Benedict Cumberbatch', 'Rachel McAdams'))
  }));

  // add actors to cast of drStrange
  const query = e.update(drStrange, ()=>({
    actors: { "+=": actors }
  }));



Query parameters
^^^^^^^^^^^^^^^^

.. code-block:: typescript

  const query = e.params({
    title: e.str,
    release_year: e.int64,
  },
  (params) => {
    return e.insert(e.Movie, {
      title: params.title,
      release_year: params.release_year,
    }))
  };

  const result = await query.run(client, {
    title: 'Thor: Love and Thunder',
    release_year: 2022,
  });
  // {id: string}

.. note::

  Continue reading for more complete documentation on how to express any
  EdgeQL query with the query builder.


Globals
^^^^^^^

Reference global variables.

.. code-block::

  e.global.user_id;
  e.default.global.user_id;  // same as above
  e.my_module.global.some_value;

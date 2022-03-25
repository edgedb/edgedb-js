.. _edgedb-js-execution:

Expressions
-----------

The query builder is exact what it sounds like: a way to declare EdgeQL
queries with code. By convention, it's imported from the directory where it was
generated as a single, default import called ``e``.

.. code-block:: typescript

  import e from "./dbschema/edgeql-js";

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
  e.int64;
  e.duration;
  e.cal.local_date;

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

Below is a number of expressions and the
EdgeQL they produce. (The actual EdgeQL the create may look slightly
different, but it's equivalent.) You can extract an EdgeQL representation of
any expression calling the ``.toEdgeQL()`` method.

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

Expressions can be executed with the ``.run`` method.

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

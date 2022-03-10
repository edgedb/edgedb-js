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


Expressions are runnable
^^^^^^^^^^^^^^^^^^^^^^^^

Expressions can be executed with the ``.run`` method.

.. code-block:: typescript

  import * as edgedb from "edgedb";

  const client = edgedb.createClient();
  const myQuery = e.str("Hello world")
  const result = await myQuery.run(client)
  // => "Hello world"

Note that the ``.run`` method accepts an instance of :js:class:`Client` (or
``Transaction``) as it's first argument. See :ref:`Creating a Client
<edgedb-js-create-client>` for details on creating clients. The second
argument is for passing :ref:`$parameters <edgedb-js-parameters>`, more on
that later.

.. code-block:: typescript

  .run(client: Client | Transaction, params: Params): Promise<T>


Expressions have a type and a cardinality
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Just like expressions in EdgeQL, all expressions are associated with a type
and a cardinality. The query builder is extremely good at *inferring* these.
You can see the values of these with the special ``__element__`` and
``__cardinality__`` properties.

.. code-block:: typescript

  const q1 = e.str("Hello");
  q1.__element__;       // e.str
  q1.__cardinality__;   // "One"

  const q2 = e.Movie;
  q2.__element__;       // e.Movie
  q2.__cardinality__;   // "Many"


The inferred type of *any* expression can be extracted with the ``$infer``
helper.

.. code-block:: typescript

  import e, {$infer} from "./dbschema/edgeql-js";

  const query = e.select(e.Movie, () => ({ id: true, title: true }));
  type result = $infer<typeof query>;
  // {id: string; title: string}[]

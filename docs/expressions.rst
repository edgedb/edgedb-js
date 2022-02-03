.. _edgedb-js-execution:

Expressions
-----------

Here's a brief "Hello World" example.

.. code-block:: typescript

  import * as edgedb from "edgedb";
  import e from "./dbschema/edgeql-js";

  const client = edgedb.createClient();

  async function run(){
    const myQuery = e.select("Hello world!");
    const result = await myQuery.run(client);
    console.log(result); // "Hello world!"
  }

A few things to note:

**#1** The query builder is imported directly from the directory where it was
generated. By convention, the entire query builder is imported as a single,
default import called ``e``.

**#2** The result of ``e.select("Hello world!")`` is an *expression*. In fact, everything you produce with the query builder is an expression. (Don't worry if the API doesn't look familiar, it'll be covered later.)

.. code-block:: typescript

  e.str("Hello world!");
  e.set(1, 2, 3);
  e.count(e.Movie);
  e.select(e.Movie, hero => ({ id: true, title: true }));
  e.insert(e.Movie, { title: "Iron Man "});

**#3** Expressions can be executed with the ``.run`` method. This method accepts a :js:class:`Client` or ``Transaction`` instance.

.. code-block:: typescript

  .run(client: Client | Transaction, params: Params): Promise<T>

See :ref:`Creating a Client <edgedb-js-create-client>` for details on creating clients. The second argument is for passing :ref:`<parameters<edgedb-js-parameters>`—more on that later.


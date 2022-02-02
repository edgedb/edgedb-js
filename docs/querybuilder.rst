.. _edgedb-js-qb:


Query Builder
=============

The EdgeDB query builder provides a **code-first** way to write **fully-typed** EdgeQL queries with TypeScript (or JavaScript). Unlike SQL, EdgeQL can be elegantly represented using the constructs of modern programming languages, like objects, methods, and closures.

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    id: true,
    secret_identity: true,
    filter: e.op(hero.name, '=', 'Iron Man')
  });


.. FAQs
.. ####

Is it an ORM?
-------------

Nope. There's no "object-relational mapping" happening here—that's all handled by EdgeDB itself.

The query builder itself is a comparatively thin wrapper over EdgeQL. We've designed the API such that the TypeScript representation of a query is structurally similar to the equivalent EdgeQL.

.. code-block:: edgeql

  select Hero {
    id,
    name,
    name_uppercase := str_upper(.name)
  }
  filter .name = "Iron Man"

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    id: true,
    name: true,
    name_uppercase := e.str_upper(hero.name),
    filter: e.op(hero.name, '=', 'Iron Man')
  });

More importantly, it gives you access to the **full power** of EdgeQL! The query builder can represent EdgeQL queries of arbitrary complexity.

By comparison, SQL-based ORMs are limited in what they can represent. Things like computed properties, SQL's large standard library of functions, aggregations, transactions, and subqueries are rarely possible. But even for the simple stuff, we think the query builder API is more readable, compact, and intuitive than any ORM on the market.

Why use the query builder?
--------------------------

**Type inference!** If you're using TypeScript, the **result type** of *all
queries* is automatically inferred for you. For the first time, you don't
need an ORM to write strongly typed queries.

.. code-block:: typescript

  const q1 = e.select(5);
  // number

  const q2 = e.select(e.Hero);
  // {id:string}[]

  const q3 = e.select(e.Hero, hero => ({
    id: true,
    name: true
  }));
  // {id:string; name: string}[]


**Auto-completion!** You can write queries full autocompletion on EdgeQL keywords, standard library functions, and link/property names.

**Typechecking!** In the vast majority of cases, the query builder won't let you construct invalid queries. This eliminates an entire class of bugs and helps you write valid queries the first time.


How do I use it?
----------------

Minimum requirements
^^^^^^^^^^^^^^^^^^^^

It's possible to use the query builder with or without TypeScript. Some requirements apply to TypeScript users only.

- Node.js 10+. Run ``node --version`` to see your current version. TypeScript users should also install Node.js typing: ``npm install @types/node``
- TypeScript 4.4+
- Make sure the following ``compilerOptions`` exist in your ``tsconfig.json``:

  .. code-block:: javascript

    // tsconfig.json
    {
      // ...
      "compilerOptions": {
        // ...
        "strict": true,
        "downlevelIteration": true,
      }
    }

Initialize a project
^^^^^^^^^^^^^^^^^^^^

Set up an :ref:`EdgeDB project <ref_guide_using_projects>` for your application. Follow the :ref:`Quickstart <ref_quickstart>` for detailed instructions on installing the CLI, initializing a project, writing a basic schema, and executing your first migration.

Install the JavaScript client library
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Install the ``edgedb`` package from NPM.

.. code-block:: bash

  $ npm install edgedb
  # OR
  $ yarn add edgedb

Generate the query builder
^^^^^^^^^^^^^^^^^^^^^^^^^^

Generate the query builder with the following command.

.. code-block:: bash

  $ npx edgeql-js


.. note::

  For Yarn users, ``yarn edgeql-js`` will also work.

You'll see something like this.

.. code-block:: bash

  $ npx edgeql-js
  Detected tsconfig.json, generating TypeScript files.
    To override this, use the --target flag.
    Run `npx edgeql-js --help` for details.
  Generating query builder into ./dbschema/edgeql-js
  Connecting to EdgeDB instance...
  Introspecting database schema...
  Generation successful!

This command establishes a connection to your database, introspects the current schema, and generates a bunch of files. By default, these files are written to the ``./dbschema/edgeql-js`` directory, as
defined relative to your project root. The project root is identified by
scanning up the file system for a ``package.json``.

.. note::

  **Connection issue?**

  Seeing a connection error? This command must be able to connect to a running EdgeDB instance. If you're using ``edgedb project init``, this is automatically handled for you. Otherwise, you'll need to explicitly pass connection information, just like any other CLI command. See :ref:`Client Libraries > Connection <edgedb_client_connection>` for guidance.

Update ``.gitignore``
^^^^^^^^^^^^^^^^^^^^^

When you generate the query builder for the first time, you'll be prompted to add the generated files to your ``.gitignore``.

.. code-block:: bash

  $ npx edgeql-js
  ...
  Checking the generated query builder into version control
  is NOT RECOMMENDED. Would you like to update .gitignore to ignore
  the query builder directory? The following line will be added:

    dbschema/edgeql-js

  [y/n] (leave blank for "y")

Once you confirm this prompt, a line will be automatically added to your ``.gitignore`` to exclude the generated files from Git.

Configuring ``npx edgeql-js``
-----------------------------

The generation command is configurable in a number of ways.

``--output-dir <path>``
  Sets the output directory for the generated files.

``--target <ts|cjs|esm>``
  What type of files to generate.

  .. list-table::

    * - ``ts``
      - Generate TypeScript
    * - ``cjs``
      - Generate JavaScript with CommonJS (``require/module.exports``) syntax
    * - ``esm``
      - Generate JavaScript with ES Module (``import/export``) syntax

  The default is determined according the the following simple algorithm:

  1. Check for a ``tsconfig.json`` in the project root. If it exists, use ``--target ts``.
  2. Otherwise. check if ``package.json`` includes ``"type": "module"``. If so, use ``--target esm``.
  3. Otherwise, use ``--target cjs``.


``--force-overwrite``
  To avoid accidental changes, you'll be prompted to confirm whenever the
  ``--target`` has changed from the previous run. To avoid this prompt, pass
  ``--force-overwrite``.

``-h/--help``
  Prints full documentation.

The generator also supports all the :ref:`connection flags
<ref_cli_edgedb_connopts>` supported by the EdgeDB CLI. These aren't
necessary when using a project or environment variables to configure a
connection.

Running queries
---------------

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

⬇️ The query builder is imported directly from the directory where it was
generated.
📛 By convention, the entire query builder is imported as a single,
default import called ``e`` but you can use any variable name you like.
🏃‍♀️ Queries are executed by calling the ``.run`` method on the query object. The first argument to ``.run`` is a client (or transaction) instance.

.. code-block:: typescript

  .run(client: Client | Transaction, params: Params): Promise<T>

See :ref:`Creating a Client <edgedb-js-create-client>` for details on creating clients. The second argument is for *parameters*—more on that later.


.. Modules
.. -------

.. All *types*, *functions*, and *commands* are available on the ``e`` object, properly namespaced by module.

.. .. code-block:: typescript

..   // commands
..   e.select;
..   e.insert;
..   e.update;
..   e.delete;

..   // types
..   e.std.str;
..   e.std.int64;
..   e.std.bool;
..   e.cal.local_datetime;
..   e.default.User; // user-defined object type
..   e.my_module.Foo; // object type in user-defined module

..   // functions
..   e.std.len;
..   e.std.str_upper;
..   e.math.floor;
..   e.sys.get_version;

.. For convenience, the contents of the ``std`` and ``default`` modules are also exposed at the top-level of ``e``.

.. .. code-block:: typescript

..   e.str;
..   e.int64;
..   e.bool;
..   e.len;
..   e.str_upper;
..   e.User;

.. .. note::

..   If there are any name conflicts (e.g. a user-defined module called ``len``),
..   ``e.len`` will point to the user-defined module; in that scenario, you must
..   explicitly use ``e.std.len`` to access the built-in ``len`` function.

Literals
--------

Literal values are declared using constructor functions that correspond to primitive EdgeDB datatypes.

.. list-table::

  * - **Query builder**
    - **EdgeQL equivalent**
  * - ``e.str("asdf")``
    - ``"asdf"``
  * - ``e.int64(123)``
    - ``1234``
  * - ``e.float64(123.456)``
    - ``123.456``
  * - ``e.bool(true)``
    - ``true``
  * - ``e.bigint(12345n)``
    - ``12345n``
  * - ``e.decimal("1234.1234n")``
    - ``1234.1234n``
  * - ``e.uuid("599236a4-2a5e-4249-91b6-ec435d3afe20")``
    - ``<uuid>"599236a4-2a5e-4249-91b6-ec435d3afe20"``
  * - ``e.json({asdf: 1234})``
    - ``<json>(asdf := 1234)``



Temporal literals
^^^^^^^^^^^^^^^^^

With the exception of ``datetime``, EdgeDB's temporal datatypes don't have equivalents in the JavaScript type system. As such, these constructors expect an instance of a corresponding class that can be imported from the ``edgedb`` NPM package. These classes are documented on the :ref:`Datatypes <edgedb-js-datatypes>` page.

.. list-table::

  * - ``e.datetime``
    - ``Date``
  * - ``e.duration``
    - :js:class:`Duration`
  * - ``e.cal.local_date``
    - :js:class:`LocalDate`
  * - ``e.cal.local_time``
    - :js:class:`LocalTime`
  * - ``e.cal.local_datetime``
    - :js:class:`LocalDateTime`

The code below demonstrates how to declare each kind of temporal literal, along with the equivalent EdgeQL.

.. code-block:: typescript

  const my_date = new Date();
  e.datetime(my_date);

  const myDuration = new edgedb.Duration(0, 0, 0, 0, 1, 2, 3);
  e.duration(myDuration);
  // <duration>'1 hours 2 minutes 3 seconds'

  const myLocalDate = new edgedb.LocalDate(1776, 07, 04);
  e.cal.local_date(myLocalDate);
  // <cal::local_date>'1776-07-04';

  const myLocalTime = new edgedb.LocalTime(13, 15, 0);
  e.cal.local_time(myLocalTime);
  // <cal::local_time>'13:15:00';

  const myLocalDateTime = new edgedb.LocalDateTime(1776, 07, 04, 13, 15, 0);
  e.cal.local_datetime(myLocalDateTime);
  // <cal::local_datetime>'1776-07-04T13:15:00';

Enums
^^^^^

.. code-block:: typescript

  e.CustomEnum('green');
  e.sys.VersionStage('beta');

Arrays
^^^^^^

.. code-block:: typescript

  e.array([e.str(1), e.str(2), e.str(3)]);
  // [1, 2, 3]


EdgeQL semantics are enforced by TypeScript, so arrays can't contain elements
with incompatible types.

.. code-block:: typescript

  e.array([e.int64(5), e.str("foo")]);
  // TypeError!


Tuples
^^^^^^

Declare a tuple.

.. code-block:: typescript

  e.tuple([e.str("Peter Parker"), e.int64(18), e.bool(true)]);
  // ("Peter Parker", 18, true)

Declare a named tuple.

.. code-block:: typescript

  e.tuple({
    name: e.str("Peter Parker"),
    age: e.int64(18),
    is_spiderman: e.bool(true)
  });
  // (name := "Peter Parker", age := 18, is_spiderman := true)


Types and casting
-----------------

The literal functions (e.g. ``e.str``, ``e.int64``, etc.) serve a dual
purpose. They can be used as functions to instantiate literals
(``e.str("hi")``) or can be used as variables to represent the *type itself*
(``e.str``).

Declaring types
^^^^^^^^^^^^^^^

.. code-block:: typescript

  e.str;                      // str
  e.int64;                    // int64
  e.array(e.bool);            // array<bool>
  e.tuple([e.str, e.int64]);  // tuple<str, int64>
  e.tuple({             // tuple<name: str, age: int64>
    name: e.str,
    age: e.int64
  });


Custom literals
^^^^^^^^^^^^^^^

You can use ``e.literal`` to create literals corresponding to collection
types like tuples, arrays, and primitives. The first argument expects a type, the second expects a *value* of that type.

.. code-block:: typescript

  e.literal(e.str, "sup");
  // equivalent to: e.str("sup")

  e.literal(e.array(e.int16), [1, 2, 3]);
  // <array<int16>>[1, 2, 3]

  e.literal(e.tuple([e.str, e.int64]), ['baz', 9000]);
  // <tuple<str, int64>>("Goku", 9000)

  e.literal(
    e.tuple({name: e.str, power_level: e.int64}),
    {name: 'Goku', power_level: 9000}
  );
  // <tuple<str, bool>>("asdf", false)



.. _ref_qb_casting:

Casting
^^^^^^^

These types can be used to *cast* an expression to another type.

.. code-block:: typescript

  e.cast(e.json, e.array(e.str("Hello"), e.str("world!")));
  // <json>["Hello", "world!"]

Parameters
^^^^^^^^^^

This is also necessary to specify the expected types of *query parameters*.
This is described in greater detail in the Select section below.

.. code-block:: typescript

  const query = e.withParams({ name: e.str }, params => e.select(params.name));
  /*
    with name := <str>$name
    select name;
  */


Creating sets
-------------

.. code-block:: typescript

  e.set(e.str("asdf"), e.str("qwer"));
  // {'asdf', 'qwer'}

EdgeQL semantics are enforced by TypeScript. Sets can't contain elements
with incompatible types, but implicit casting works as expected.

.. code-block:: typescript

  e.set(e.int16(1234), e.int64(1234)); // set of int64
  e.set(e.int64(1234), e.float32(12.34)); // set of float64
  e.set(e.str("asdf"), e.int32(12)); // TypeError

Empty sets
^^^^^^^^^^

To declare an empty set, pass a type as the first and only argument:

.. code-block:: typescript

  e.set(e.int64);
  // <std::int64>{}


Object types and paths
----------------------

All object types in your schema are reflected into the query builder, properly
namespaced by module.

.. code-block:: typescript

  e.default.Hero;
  e.default.Villain;
  e.default.Movie;
  e.my_module.SomeType;

For convenience, all types in the ``default`` module are also available at the
top-level.

.. code-block:: typescript

  e.Hero;
  e.Villain;
  e.Movie;

Paths
^^^^^

As in EdgeQL, you can declare *path expressions*.

.. code-block:: typescript

  e.Hero.name;
  e.Movie.title;
  e.Movie.characters.name;

Type intersections
^^^^^^^^^^^^^^^^^^

Use the type intersection operator to narrow the type of the set. For
instance, to represent the chararacters in a movie that are of type ``Hero``:

.. code-block:: typescript

  e.Movie.characters.is(e.Hero);
  // Movie.characters[is Hero]


Backlinks
^^^^^^^^^

All possible backlinks are auto-generated and behave just like forward links.
However, because they contain special characters, you must use bracket syntax
instead of simple dot notation.

.. code-block:: typescript

  e.Hero["<nemesis[is default::Villain]"];
  // Hero.<nemesis[is default::Villain];

  e.Hero['<characters[is default::Movie]'];
  // Hero.<characters[is default::Movie];

  e.Villain['<characters[is default::Movie]'];
  // Villain.<characters[is default::Movie];

For convenience, these backlinks automatically combine the backlink operator
and type intersection into a single key. However, the query builder also
provides "naked" backlinks; these can be refined with the ``.is`` type
intersection method.

.. code-block:: typescript

  e.Hero['<nemesis'].is(e.Villain);
  // Hero.<nemesis[is Villain]


Functions
---------

All built-in standard library functions are reflected as functions in ``e``.

.. code-block:: typescript

  e.str_upper(e.str("hello"));
  // str_upper("hello")

  e.plus(e.int64(2), e.int64(2));
  // 2 + 2

  const nums = e.set(e.int64(3), e.int64(5), e.int64(7))
  e.in(e.int64(4), nums);
  // 4 in {3, 5, 7}

  e.math.mean(nums);
  // math::mean({3, 5, 7})


Operators
---------

All operators are expressed using the ``e.op`` function.

**Unary operators**

Unary operators operate on a single argument: ``OPERATOR <arg>``.

.. code-block:: typescript

  e.op('not', e.bool(true)); // not true
  e.op('exists', e.set('hi')); // exists {'hi'}

**Binary operators**

Unary operators operate on two arguments: ``<arg> OPERATOR <arg>``.

.. code-block:: typescript

  e.op(e.str('Hello '), '++', e.str('World!'));
  // 'Hello ' ++ 'World!'


**Ternary operators**

Unary operators operate on three arguments: ``<arg> OPERATOR <arg> OPERATOR <arg>``. Currently there's only one ternary operator: the ``if else`` construct.

.. code-block:: typescript

  e.op(e.str('😄'), 'if', e.bool(true), 'else', e.str('😢'));
  // 😄 if true else 😢

**Operator reference**

.. list-table::

  * - Unary operators
    - ``"exists"`` ``"distinct"`` ``"not"``
  * - Binary operators
    - ``"="`` ``"?="`` ``"!="`` ``"?!="`` ``">="`` ``">"`` ``"<="`` ``"<"`` ``"or"`` ``"and"`` ``"+"`` ``"-"`` ``"*"`` ``"/"`` ``"//"`` ``"%"`` ``"^"`` ``"in"`` ``"not_in"`` ``"union"`` ``"??"`` ``"++"`` ``"like"`` ``"ilike"`` ``"not_like"`` ``"not_ilike"``
  * - Ternary operators
    - ``"if"/"else"``


.. * - ``=``
..   - ``e.eq``
.. * - ``?=``
..   - ``e.coal_eq``
.. * - ``!=``
..   - ``e.neq``
.. * - ``?!=``
..   - ``e.coal_neq``
.. * - ``>=``
..   - ``e.gte``
.. * - ``>``
..   - ``e.gt``
.. * - ``<=``
..   - ``e.lte``
.. * - ``<``
..   - ``e.lt``
.. * - ``OR``
..   - ``e.or``
.. * - ``AND``
..   - ``e.and``
.. * - ``NOT``
..   - ``e.not``
.. * - ``+``
..   - ``e.plus``
.. * - ``-``
..   - ``e.minus``
.. * - ``*``
..   - ``e.mult``
.. * - ``/``
..   - ``e.div``
.. * - ``//``
..   - ``e.floordiv``
.. * - ``%``
..   - ``e.mod``
.. * - ``^``
..   - ``e.pow``
.. * - ``IN``
..   - ``e.in``
.. * - ``NOT IN``
..   - ``e.not_in``
.. * - ``EXISTS``
..   - ``e.exists``
.. * - ``DISTINCT``
..   - ``e.distinct``
.. * - ``UNION``
..   - ``e.union``
.. * - ``??``
..   - ``e.coalesce``
.. * - ``IF``
..   - ``e.if_else``
.. * - ``++``
..   - ``e.concat``
.. * - ``[i]``
..   - ``e.index``
.. * - ``[i:j:k]``
..   - ``e.slice``
.. * - ``[key]``
..   - ``e.destructure`` (JSON element access)
.. * - ``++``
..   - ``e.concatenate``
.. * - ``LIKE``
..   - ``e.like``
.. * - ``ILIKE``
..   - ``e.ilike``
.. * - ``NOT LIKE``
..   - ``e.not_like``
.. * - ``NOT ILIKE``
..   - ``e.not_ilike``

Select
------

The full power of the ``select`` statement is available as an overloaded,
top-level ``e.select`` function.

Scalars
^^^^^^^

.. code-block:: typescript

  e.select(e.int64(1234));
  // select 1234;

  e.select(a.add(e.int64(2), e.int64(2)));
  // select 2 + 2;

  e.select(e.concat('aaaa', e.to_str(e.int64(111)));
  // select 'aaaa' ++ to_str(111)

Free shapes
^^^^^^^^^^^

.. code-block:: typescript

  e.select({
    name: e.str("Name"),
    number: e.int64(1234),
    heroes: e.Hero,
  });
  /* select {
    name := "Name",
    number := 1234,
    heroes := Hero
  } */


Objects
^^^^^^^

As in EdgeQL, selecting an set of objects without a shape will return their
IDs only.

.. code-block:: typescript

  const query = e.select(e.Hero); // select Hero;
  const result = await query.run(client); // {id:string}[]

Shapes
^^^^^^

To specify a shape, pass a function as the second argument. This function
should return an object, which is analagous to an EdgeQL shape.

.. code-block:: typescript

  const query = e.select(e.Hero, ()=>({
    id: true,
    name: true,
    secret_identity: true,
  }));

  const result = await query.run(client);
  /* {
    id: string;
    name: string;
    secret_identity: string | undefined;
  }[] */

As you can see, the type of ``secret_identity`` is ``string | undefined`` in
the output, as it's an optional property, whereas ``id`` and ``name`` are
required.

A value of ``true`` indicates that the property should be included in the
selection set. By contrast, a value of false explicitly exludes it. You
can also pass a non-literal ``boolean`` expression, in which case the field
will be made optional in the result.

As in EdgeQL, shapes can be nested to fetch deeply related objects.

.. code-block:: typescript

  const query = e.select(e.Hero, ()=>({
    id: false,
    name: Math.random() > 0.5
  }));

  const result = await query.run(client);
  /* {
    id: never;
    name: string | undefined;
  }[] */


Why closures?
^^^^^^^^^^^^^

In EdgeQL, a ``select`` statement introduces a new *scope*; within the clauses
of a select statement, you can refer to fields of the *elements being
selected* using leading dot notation.

.. code-block:: edgeql

  select Hero { id, name }
  filter .name = "Groot";

Here, ``.name`` is shorthand for the ``name`` property of the selected
``Hero`` elements. All properties/links on the ``Hero`` type can be referenced
using this shorthand anywhere in the ``select`` expression. In other words,
the ``select`` expression is *scoped* to the ``Hero`` type.

To represent this scoping in the query builder, we use functions. This is a
powerful pattern that makes it painless to represent filters, ordering,
computed fields, and other expressions. Let's see it in action.


Filtering
^^^^^^^^^

To add a filtering clause, just include a ``filter`` key in the returned
params object. This should correspond to a boolean expression.

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    id: true,
    name: true,
    filter: e.or(e.ilike(hero.name, "%Man"), e.ilike(hero.name, "The %")))
  }))

Since ``filter`` is a reserved keyword in EdgeQL, there is minimal danger of
conflicting with a property or link named ``filter``. Since the ``filter`` key
is special, it isn't possible to include a computed property named
``filter`` at the moment.

All shapes can contain filter clauses, even nested ones.

### Nested filtering

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    name: true,
    villains: villain => ({
      name: true
      filter: e.like(villain.name, "Mr. %"),
    }),
    filter: e.op(hero.name, '=', e.str("Iron Man")),
  }));


Ordering
^^^^^^^^

As with ``filter``, you can pass a value with the special ``order_by`` key. This
key can correspond to an arbitrary expression. To simply order by a property:

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    order_by: hero.name,
  }));

To customize the ordering and empty-handling parameters, you can also pass an
object into ``order_by``:

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    order_by: {
      expression: hero.name,
      direction: e.DESC,
      empty: e.EMPTY_FIRST,
    },
  }));


Or do compound ordering with an array of objects:

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    name: true,
    order_by: [
      {
        expression: hero.name,
        direction: e.DESC,
        empty: e.EMPTY_FIRST,
      },
      {
        expression: hero.secret_identity,
        direction: e.ASC,
        empty: e.EMPTY_LAST,
      },
    ],
  }));


Pagination
^^^^^^^^^^

Use ``offset`` and ``limit`` to paginate queries. Both should correspond to
``int64`` expressions.

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    offset: e.len(hero.name),
    limit: e.int16(15),
  }));


For simplicity, both also support ``number`` literals.

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    offset: 20,
    limit: 10
  }));

As in EdgeQL, passing ``limit: 1`` guarantees that the query will only return
a single item (at most). This is reflected in the resulting type.

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    name: true,
  }));
  // {name: string}[]

  e.select(e.Hero, hero => ({
    name: true,
    limit: 1
  }));
  // {name: string} | null

Computeds
^^^^^^^^^

To add a computed field, just add it to the returned shape alongside the other
elements. All reflected functions are typesafe, so the output type

.. code-block:: typescript

  const query = e.select(e.Hero, hero => ({
    name: true,
    uppercase_name: e.str_upper(hero.name),
    name_len: e.len(hero.name),
  }));

  const result = await query.run(client);
  /* =>
    [
      {
        name:"Iron Man",
        uppercase_name: "IRON MAN",
        name_len: 8
      },
      ...
    ]
  */
  // {name: string; uppercase_name: string, name_len: number}[]


Computables can "override" an actual link/property as long as the type
signatures agree.

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    name: e.str_upper(hero.name), // this works
    secret_identity: e.int64(5), // TypeError

    // you can override links too!
    villains: e.select(e.Villain, _ => ({ name: true })),
  }));


Polymorphism
^^^^^^^^^^^^

EdgeQL supports polymorphic queries using the ``[IS type]`` prefix.

.. code-block::

  select Person {
    name,
    [IS Hero].secret_identity,
    [IS Villain].nemesis: { name }
  }

In the query builder, this is represented with the ``e.is`` function.

.. code-block:: typescript

  e.select(e.Person, person => ({
    name: true,
    ...e.is(e.Hero, { secret_identity: true }),
    ...e.is(e.Villain, { nemesis: {name: true}}),
  }));

  const result = await query.run(client);
  /* {
    id: string;
    secret_identity: string | null;
    nemesis: {
        name: string;
    } | null;
  }[] */

The type signature of the result reflects the fact that polymorphic fields
like ``secret_identity`` will only occur in certain objects.

Type intersection
^^^^^^^^^^^^^^^^^

.. code-block:: typescript

  // select Movie { characters[is Hero]: { id }}
  e.select(e.Movie, movie => ({
    characters: movie.characters.is(e.Hero),
  }));


To specify shape, use subqueries:

.. code-block:: typescript

  e.select(e.Movie, movie => ({
    id: true,
    characters: e.select(movie.characters.is(e.default.Hero), hero => ({
      id: true,
      secret_identity: true,
    })),
  }));


Insert
------

.. code-block:: typescript

  e.insert(e.Movie, {
    title: "Spider-Man 2",
    characters: e.select(e.Person, person => ({
      filter: e.in(person.name, e.set("Spider-Man", "Doc Ock")),
    })),
  });


Handling conflicts
^^^^^^^^^^^^^^^^^^

In EdgeQL, "upsert" functionality is achieved by handling **conflicts** on
``insert`` statements with the ``unless conflict`` clause. In the query
builder, this is possible with the ``.unlessConflict`` method (available only
on ``insert`` expressions).

In the simplest case, adding ``.unlessConflict`` (no arguments) will prevent
EdgeDB from throwing an error if the insertion would violate an exclusivity
contstraint. Instead, the query would return the pre-existing object.

.. code-block:: typescript

  e.insert(e.Movie, {
    title: "Spider-Man: Homecoming",
  }).unlessConflict();


To specify an ``on`` clause:

.. code-block:: typescript

  e.insert(e.Movie, {
    title: "Spider-Man 2",
  }).unlessConflict(movie => ({
    on: movie.title, // can be any expression
  }));


To specify an ``on...else`` clause:

.. code-block:: typescript

  e.insert(e.Movie, {
    title: "Spider-Man 2",
  }).unlessConflict(movie => ({
    on: movie.title,
    else: e.select(movie).update({
      title: "Spider-Man 2",
    }),
  }));


Update
------

Update queries are a represented as a ``.update()`` method on ``e.select``
queries. This way, you ``select`` a set of objects to update first, then
specify how they should be updated.

.. code-block:: typescript

  // update method
  e.update(e.Movie, movie => ({
    filter: e.op(movie.title, '=', e.str("Avengers 4")),
    // order_by: ...,
    // offset: ...,
    set: {

      // reference current value
      title: e.str_upper(movie.title),

      // support literals
      title: "Avengers: Endgame",

      // set link
      characters: e.union(e.Hero, e.Villain),

      // add to link
      characters: {"+=": e.insert(e.Hero, {name: "Gilgamesh"})},

      // subtract from link
      characters: {
        "-=": e.select(e.Villain, villain => ({
          filter: e.eq(villain.name, e.str("Thanos")),
        })),
      },
    }
  }))

Delete
------

.. code-block:: typescript

  e.delete(e.Hero, hero => ({
    filter: ..,
    order_by: ...,
    offset: ...,
    limit: ...
  }));

The only supported keys are ``filter``, ``order_by``, ``offset``, and ``limit``.

Detach
------

.. code-block:: typescript

  const detachedVillain = e.detached(e.Villain);
  const villain = e.select(e.Hero, outer => ({
    name: true,
    shared_nemesis: e.select(detachedVillain, inner => ({
      filter: e.op(outer.nemesis, '=', inner.nemesis)
    }))
  }));

Parameters
----------

.. code-block:: typescript

  const fetchPerson = e.params(
    {
      // scalar parameters
      bool: e.bool,
      data: e.array(e.str),

      // supports any type
      nested: e.array(e.tuple({test: e.str})),

      // optional params
      optional: e.optional(e.str),
    },
    params =>
      e.select(e.Person, person => ({
        id: true,
        maybe: params.optional, // computable
        filter: e.in(person.name, e.array_unpack(params.name)),
      }))
  );

  await fetchPerson.run(client, {
    bool: true,
    data: ['aaa','bbb', 'ccc,],
    nested: [{test:"sup"}],
    optional: null
  })


``WITH`` blocks
---------------

During the query rendering step, the number of occurrences of each expression
are tracked. All expressions that are referenced more than once and are not
explicitly defined in a ``WITH`` block (with ``e.with``), are extracted into
the nearest ``WITH`` block that encloses all usages of the expression.

.. code-block:: typescript

  const a = e.set(e.int64(1), e.int64(2), e.int64(3));
  const b = e.alias(a);

  e.select(e.plus(a, b)).toEdgeQL();
  // WITH
  //   a := {1, 2, 3},
  //   b := a
  // SELECT a + b

This hold for expressions of arbitrary complexity.

.. code-block:: typescript

  const newHero = e.insert(e.Hero, {
    name: "Batman",
  });

  const newVillain = e.insert(e.Villain, {
    name: "Dr. Evil",
    nemesis: newHero,
  });

  return e.select(newVillain, {
    id: true,
    name: true,
  });


To embed ``WITH`` statements inside queries, you can short-circuit this logic
with a "dependency list". It's an error to pass an expr to multiple
``e.with``s, and an error to use an expr passed to ``e.with`` outside of that
WITH block in the query.

We add a top level e.alias() function. This will create an alias of the expr
passed to it in a WITH block.

.. code-block:: typescript

  return e.select(
    e.with(
      [newHero, newVillain], // list "dependencies";
      e.select(newVillain, {
        id: true,
        name: true,
      })
    )
  );


``FOR`` loops
-------------

.. code-block:: typescript

  e.for(e.set("1", "2", "3"), number => {
    // do stuff
  });

  e.for(e.Hero, hero => {
    // do stuff
  });

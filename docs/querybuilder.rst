.. _edgedb-js-qb:


EdgeQL Query Builder
====================

The EdgeDB query builder provides a way to write *fully-typed* EdgeQL queries with code. It's generated from your database schema.

- It's **not an ORM**. There's no "object-relational mapping" happening here;
  that's all handled by EdgeDB itself. Instead, the query builder is a
  relatively thin wrapper over EdgeQL, and gives you access the full power of
  EdgeQL.
- The query builder **introspects your schema** and generates a schema-aware
  API.
- The query syntax is just TypeScript, so **your queries are statically
  checked**, making it easier to write valid queries the first time. And most
  importantly: the **query results are strongly typed**!

You don't need to choose between ORMs and "raw" queries anymore. The
EdgeQL query builder represents a third path: an auto-generated API that's
*fully typed* and exposes the *full power* of the underlying query language.


Requirements
------------

- Node v10+ or higher
- If using TypeScript:
  - TS 4.4+
  - ``yarn add @types/node --dev``
  - the following compiler options in ``tsconfig.json``:

    .. code-block:: json

      {
        // ...
        "compilerOptions": {
          // ...
          "strict": true,
          "downlevelIteration": true,
        }
      }


Generation command
------------------

The query builder is a *generated* by introspecting the schema of a live database, *not* your ``.esdl`` files. We recommend using `projects <ref_guide_using_projects>` to develop an EdgeDB-backed application locally. Refer to the `Client Library Connection <edgedb_client_connection>` docs for details.

If you haven't already, install the ``edgedb`` client library.

.. code-block:: bash

  $ npm install edgedb # OR: `yarn add edgedb`

Then, generate the query builder:

.. code-block:: bash

  $ npx edgeql-js
  Detected tsconfig.json, generating TypeScript files.
    To override this, use the --target flag.
    Run `npx edgedb-generate --help` for details.
  Generating query builder into ./dbschema/edgeql
  Connecting to EdgeDB instance...
  Introspecting database schema...
  Generation successful!

When you run this command for the first time, you may see a prompt like this:

.. code-block:: bash

  $ npx edgeql-js # OR: `yarn edgeql-js`
  ...
  Checking the generated query builder into version control
  is NOT RECOMMENDED. Would you like to update .gitignore to ignore
  the query builder directory? The following line will be added:

    dbschema/edgeql

  [y/n] (leave blank for "y")

Checking the generated query builder into version control is not recommended. Once you confirm this prompt, a line will be added to your ``.gitignore`` to exclude the generated files from Git.

Flags
^^^^^

The generation command is configurable in a number of ways.

``--output-dir <path>``
  By default, the query builder is generated into ``./dbschema/edgeql-js``, as defined relative to your project root. The project root is identified by scanning up the file system for a ``package.json``.

  To override this, use the ``--output`` flag to pass a desired path.

  This also makes it possible to generate separate query builders for several distinct instances, which is useful if your application interfaces with multiple databases.

``--target <ts|cjs|esm>``

  The generator auto-detects whether you are using TypeScript (``--target ts``), JavaScript + CommonJS modules (``--target cjs``), or JavaScript + ES modules (``--target esm``)using the following algorithm:

  1. If a ``tsconfig.json`` is found in the project root, generate TypeScript files.

  2. Otherwise, if the ``package.json`` includes ``"type": "module"``, generate ``.mjs`` files that uses ``import/export`` syntax. (While the ``.mjs`` extension is somewhat redundant, we use it anyway, so everything works correctly when a user using CommonJS modules uses the explicit ``--target esm`` flag.

  3. Otherwise: generate ``.js`` files using CommonJS ``require/module.exports`` syntax.

``--force-overwrite``
  To avoid accidental changes, you'll be prompted to confirm whenever the ``--target`` has changed from the previous run. To avoid this prompt, pass ``--force-overwrite``.

``-h/--help``
  Prints full documentation.

The generator also supports all the `connection flags
<ref_cli_edgedb_connopts>` supported by the EdgeDB CLI. These aren't
necessary when using a project or environment variables to configure a
connection.

Running queries
---------------

.. important::

  All examples below assume you are using TypeScript.

Here's a brief Hello World example.

.. code-block:: typescript

  // index.ts
  import {createClient} from "edgedb";
  import e from "./dbschema/edgeql-js";

  const client = createClient();

  async function run(){
    const myQuery = e.select(e.str("Hello world!"));
    const result = await myQuery.run(client);
    console.log(result); // "Hello world!"
  }


A few things to note:

- The query builder is imported directly from the directory where it was
  generated. By convention, the entire query builder is imported as a single,
  default import called ``e`` but you can use any variable named you like.

- To execute a query, use the ``.run`` method. Only top-level statements (``e.
  select``, ``e.insert``, ``e.update``, ``e.delete``, ``e.for``, ``e.with``)
  support the `.run` method. This method has the following signature:

  .. code-block:: typescript

    .run(client: Client | Transaction, params: Params): Promise<T>

  The first argument expects a client or transaction object; see `Creating a
  Client <edgedb-js-create-client>` for details. The second argument is for
  *parameters*; more on that later.

- The result of ``.run`` is strongly typed; in the example, ``result`` will
  have type ``string``.


Modules
-------

All types, functions, and operators are available on the ``e`` object and properly namespaced:

.. code-block:: typescript

  e.std.eq; // equality operator (=)
  e.std.len;
  e.math.floor;
  e.sys.get_version;
  e.cal.relative_duration;
  e.default.User; // user-defined object type
  e.my_module.foo; // user-defined module

For convenience, the contents of ``std`` and ``default`` modules are also available at the top-level. (It's common to declare your schema entirely within the ``default`` module.)

.. code-block:: typescript

  e.eq;
  e.len;
  e.User;


If there are any name conflicts (e.g. a user-defined module called ``len``), ``e.len`` will point to the user-defined module; in that scenario, you must explicitly use ``e.std.len`` to access the built-in ``len`` function.

Literals
--------

All literal scalar values must be created with a dedicated function call. The name of this function maps directly onto the `type names <ref_eql_type_table>` in EdgeDB's type system.

Primitives
^^^^^^^^^^

.. code-block:: typescript

  import * as edgedb from "edgedb";
  import e from "./dbschema/edgeql-js";

  // primitives
  e.str("234");
  e.int16(123);
  e.int32(123456);
  e.int64(123456789);
  e.float32(1234.1234);
  e.float64(123456.123456);
  e.bool(true);
  e.bigint(12345n);
  e.decimal("1234.1234n");
  e.uuid("599236a4-2a5e-4249-91b6-ec435d3afe20");
  e.json(JSON.stringify({asdf: 1234}));

Temporal literals
^^^^^^^^^^^^^^^^^

.. code-block:: typescript

  e.datetime(new Date());


  e.duration(new edgedb.Duration(0, 0, 0, 0, 1, 2, 3));
  // <duration>'1 hours 2 minutes 3 seconds'

  e.cal.local_date(new edgedb.LocalDate(1776, 07, 04));
  // <cal::local_date>'1776-07-04';

  e.cal.local_time(new edgedb.LocalTime(13, 15, 0));
  // <cal::local_time>'13:15:00';

  e.cal.local_datetime(new edgedb.LocalDateTime(1776, 07, 04, 13, 15, 0));
  // <cal::local_datetime>'1776-07-04T13:15:00';

Enums
^^^^^

.. code-block:: typescript

  e.CustomEnum('green');
  e.sys.VersionStage('beta');

Arrays
^^^^^^

.. code-block:: typescript

  e.array([e.str(5)]); // [5]


EdgeQL semantics are enforced by TypeScript. Arrays can't contain elements
with incompatible types, but implicit casting works as expected.

.. code-block:: typescript

  e.array([e.int16(5), e.int64(51234)]);
  // [<int16>5, 51234]

  e.array([e.int64(5), e.str("foo")]);
  // TypeError


Tuples
^^^^^^

To declare a plain tuple:

.. code-block:: typescript

  e.tuple([e.str("Peter Parker"), e.int64(100), e.bool(true)]);
  // ("Peter Parker", 18, true)

To declare a tuple with named elements:

.. code-block:: typescript

  e.tuple({
    name: e.str("Peter Parker"),
    age: e.int64(18),
    is_spiderman: e.bool(true)
  });
  // (name := "Peter Parker", age := 18, is_spiderman := true)


Custom literals
^^^^^^^^^^^^^^^

You can use ``e.literal`` to create literal values of constructed/custom types, like nested combinations of tuples, arrays, and primitives.

.. code-block:: typescript

  e.literal(e.array(e.int16), [1, 2, 3]);
  // <array<std::int16>>[1, 2, 3]

  e.literal(e.tuple([e.str, e.bool]), ['baz', false]);
  // <tuple<str, bool>>("asdf", false)

  e.literal(e.named_tuple([e.str, e.bool]), ['baz', false]);
  // <tuple<str, bool>>("asdf", false)


Types and casting
-----------------

The literal functions (e.g. ``e.str``, ``e.int64``, etc.) serve a dual purpose. They can be used as functions to instantiate literals (``e.str("hi")``) or can be used as variables to represent the *type itself* (``e.str``).

Declaring types
^^^^^^^^^^^^^^^

.. code-block:: typescript

  e.str;                      // str
  e.int64;                    // int64
  e.array(e.bool);            // array<bool>
  e.tuple([e.str, e.int64]);  // tuple<str, int64>
  e.named_tuple({             // tuple<name: str, age: int64>
    name: e.str,
    age: e.int64
  });

Casting
^^^^^^^

These types can be used to *cast* an expression to another type.

.. code-block:: typescript

  e.cast(e.json, e.array(e.str("Hello"), e.str("world!")));
  // <json>["Hello", "world!"]

Parameters
^^^^^^^^^^

This is also necessary to specify the expected types of *query parameters*. This is described in greater detail in the Select section below.

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

For convenience, all types in the ``default`` module are also available at the top-level.

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

Use the type intersection operator to narrow the type of the set. For instance, to represent the chararacters in a movie that are of type ``Hero``:

.. code-block:: typescript

  e.Movie.characters.$is(e.Hero);
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
provides "naked" backlinks; these can be refined with the ``.$is`` type
intersection method.

.. code-block:: typescript

  e.Hero['<nemesis'].$is(e.Villain);
  // Hero.<nemesis[is Villain]


Functions and operators
-----------------------

All functions and operators are available as functions.

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


Operator table
^^^^^^^^^^^^^^

All operators are available via an alphanumeric name.

.. list-table::

  * - ``=``
    - ``e.eq``
  * - ``?=``
    - ``e.coal_eq``
  * - ``!=``
    - ``e.neq``
  * - ``?!=``
    - ``e.coal_neq``
  * - ``>=``
    - ``e.gte``
  * - ``>``
    - ``e.gt``
  * - ``<=``
    - ``e.lte``
  * - ``<``
    - ``e.lt``
  * - ``OR``
    - ``e.or``
  * - ``AND``
    - ``e.and``
  * - ``NOT``
    - ``e.not``
  * - ``+``
    - ``e.plus``
  * - ``-``
    - ``e.minus``
  * - ``*``
    - ``e.mult``
  * - ``/``
    - ``e.div``
  * - ``//``
    - ``e.floordiv``
  * - ``%``
    - ``e.mod``
  * - ``^``
    - ``e.pow``
  * - ``IN``
    - ``e.in``
  * - ``NOT IN``
    - ``e.not_in``
  * - ``EXISTS``
    - ``e.exists``
  * - ``DISTINCT``
    - ``e.distinct``
  * - ``UNION``
    - ``e.union``
  * - ``??``
    - ``e.coalesce``
  * - ``IF``
    - ``e.if_else``
  * - ``++``
    - ``e.concat``
  * - ``[i]``
    - ``e.index``
  * - ``[i:j:k]``
    - ``e.slice``
  * - ``[]``
    - ``e.destructure``
  * - ``++``
    - ``e.concatenate``
  * - ``LIKE``
    - ``e.like``
  * - ``ILIKE``
    - ``e.ilike``
  * - ``NOT LIKE``
    - ``e.not_like``
  * - ``NOT ILIKE``
    - ``e.not_ilike``

Select
------

The full power of the ``select`` statement is available as an overloaded, top-level ``e.select`` function.

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

As in EdgeQL, selecting an set of objects without a shape will return their IDs only.

.. code-block:: typescript

  const query = e.select(e.Hero); // select Hero;
  const result = await query.run(client); // {id:string}[]

Shapes: object syntax
^^^^^^^^^^^^^^^^^^^^^

Pass an object as the secong argument to specify the shape of the ``select``.

.. code-block:: typescript

  const query = e.select(e.Hero, {
    id: true,
    name: 1 > 0, // optional
    villains: {
      id: true,
      name: true,
    },
  });
  const result = await query.run(client);
  /* {
    id?: string,
    name: string | undefined,
    villains: { id:string; name:string }[]
  }[] */


Shapes: closure syntax
^^^^^^^^^^^^^^^^^^^^^^

It's often valuable to have a reference to the *thing being selected*. To support this, you can instead pass a function that *accepts a single argument* and *returns a shape object*. This is a powerful pattern that makes computed fields, filters, ordering, etc. very intuitive and brief.

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    id: 1 > 0, // optional
    name: true,
    villains: villain => ({
      id: true,
      name: true,
      name_upper: e.str_upper(villain.name),
    }),
  }));


.. The closure syntax also supports arbitrary expressions:

.. .. code-block:: typescript

..   e.select(e.Hero, hero =>
..     e.concat(e.concat(hero.name, e.str(" is ")), hero.secret_identity)
..   );


### Computeds

.. code-block:: typescript

  e.select(e.Person, person => ({
    id: true,
    name: true,
    uppercase_name: e.str_upper(person.name),
    is_hero: e.is(person, e.Hero),
  }));


Computables can share a key with an actual link/properties as long as the type signatures agree:

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    id: true,
    name: e.str_upper(hero.name),
    villains: e.select(e.Villain, villain => ({
      id: true,
      name: true,
      filter: e.eq(e.len(hero.name), e.len(villain.name)),
    })),
  }));


### Shapes: polymorphism

`e.is` returns a shape. The values should be of type `$expr_PolyShapeElement`, which keeps a reference to the polymorphic type. Inside `toEdgeQL`, when a `$expr_PolyShapeElement` is encountered, the key should be prefixed with the appropriate type intersection: `[is Hero].secret_identity`, etc.

.. code-block:: typescript

  e.select(e.Movie.characters, character => ({
    id: true,
    name: true,
    ...e.is(e.Villain, () => ({id: true, nemesis: true})),
    ...e.is(e.Hero, hero => ({
      secret_identity: true,
      villains: {
        id: true,
        name: true,
      },
    })),
  }));


`e.is(Type, ref => Shape)`: `Shape` should not allow top-level computables, as this isn't valid EdgeQL.

### Basic filtering

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    id: true,
    name: true,
    filter: e.or(e.ilike(hero.name, "%Man"), e.ilike(hero.name, "The %")))
  }))


> Filters are checked to determine whether the result set should be a singleton or not.

### Nested filtering

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    id: true,
    name: true,
    villains: villain => ({
      id: true,
      filter: e.like(villain.name, "Mr. %"),
    }),
    filter: e.eq(hero.name, e.str("Iron Man")),
  }));


### Ordering

Simple:

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    order: hero.name,
  }));


Advanced:

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    order: {
      expression: hero.name,
      direction: e.DESC,
      empty: e.EMPTY_FIRST,
    },
  }));


Multiple ordering

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    name: true,
    order: [
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


### Pagination

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    offset: e.len(hero.name),
    limit: 15,
  }));


### Type intersection

.. code-block:: typescript

  // select Movie { characters[is Hero]: { id }}
  e.select(e.Movie, movie => ({
    characters: movie.characters.$is(e.Hero),
  }));


To specify shape, use subqueries:

.. code-block:: typescript

  e.select(e.Movie, movie => ({
    id: true,
    characters: e.select(movie.characters.$is(e.default.Hero), hero => ({
      id: true,
      secret_identity: true,
    })),
  }));


## Insert

.. code-block:: typescript

  e.insert(e.Movie, {
    title: "Spider-Man 2",
    characters: e.select(e.Person, person => ({
      filter: e.in(person.name, e.set("Spider-Man", "Doc Ock")),
    })),
  });


### Conflicts

Simple

.. code-block:: typescript

  e.insert(e.Movie, {
    title: "Spider-Man 2",
  }).unlessConflict();


Specify `ON`:

.. code-block:: typescript

  e.insert(e.Movie, {
    title: "Spider-Man 2",
  }).unlessConflict(movie => ({
    on: movie.title, // can be any expression
  }));


Specify `ON ... ELSE`

.. code-block:: typescript

  e.insert(e.Movie, {
    title: "Spider-Man 2",
  }).unlessConflict(movie => ({
    on: movie.title,
    else: e.select(movie).update({
      title: "Spider-Man 2",
    }),
  }));


## Update

.. code-block:: typescript

  // update method
  e.select(e.Movie, movie => ({
    filter: e.eq(movie.title, e.str("Avengers 4")),
    // order: ...,
    // offset: ...,
  })).update({
    // set
    title: e.str("Avengers: Endgame"),

    // append
    characters: {"+=": e.set(e.Hero, e.Villain)},

    // remove
    characters: {
      "-=": e.select(e.Villain, villain => ({
        filter: e.eq(villain.name, e.str("Thanos")),
      })),
    },
  });


## Delete

.. code-block:: typescript

  e.select(e.Hero, hero => ({
    filter: e.eq(hero.name, "Captain America"),
    order: ...,
    offset: ...,
    limit: ...
  }))
    .delete();


## Detach

.. code-block:: typescript

  const detachedHero = e.detached(e.Hero);


## Parameters

.. code-block:: typescript

  const fetchPerson = e.withParams(
    {
      name: e.arg(e.array(e.str)),
      bool: e.arg(e.bool),
      optionalStr: e.optional(e.str),
    },
    args =>
      e.select(e.Person, person => ({
        id: true,
        optionalStr, // computable
        filter: e.in(person.name, e.array_unpack(args.name)),
      }))
  );


## WITH clauses

During the query rendering step, the number of occurrences of each expression are tracked.
All expressions that are referenced more than once and are not explicitly defined in a
`WITH` block (with `e.with`), are extracted into the nearest `WITH` block that encloses
all usages of the expression.

.. code-block:: typescript

  const a = e.set(e.int64(1), e.int64(2), e.int64(3));
  const b = e.alias(a);

  e.select(e.plus(a, b)).toEdgeQL();
  // WITH
  //   a := {1, 2, 3},
  //   b := a
  // SELECT a + b


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


To embed `WITH` statements inside queries, you can short-circuit this logic with a "dependency list". It's an error to pass an expr to multiple `e.with`s, and an error to use an expr passed to `e.with` outside of that WITH block in the query.

We add a top level e.alias() function. This will create an alias of the expr passed to it in a WITH block.

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


## FOR ... IN

As the `Set` class (described under "Type System") has a `cardinality` property, we're able to represent singleton cardinality inside a FOR/IN loop.

.. code-block:: typescript

  e.for(e.set("1", "2", "3"), number => {
    // do stuff
  });

  e.for(e.Hero, hero => {
    // do stuff
  });


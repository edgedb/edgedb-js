# Query builder pre-RFC

## Generation

Generation logic should live inside inside edgedb-js so the generation logic is versioned alongside the driver.

### Command

`npx edgedb generate`

Accepts basic connection options:

```
--instance, --dsn, -I
--database, -d
--host, -h,
--port, -P
--username, -u
--password, -p

// more?
```

Also accepts:

```
--output [output]  (default: "./node_modules/.edgedb")
  This is the name of the subdirectory the query
  builder will be generated into. It is resolved from
  the computed project root. This lets users optionally
  generate the query builder elsewhere in their
  codebase (possible to a location where it will be
  tracked by verison control.)

  It also makes it possible for users to generate
  multiple QBs from different instances. This isn't
  possible in Prisma. To do so, it is recommended
  to generate into a subdirectory of `node_modules`
  that starts with a period, which will prevent
  the generated code from being pruned by Yarn when
  new modules are installed.
```

### Connection

The `npx edgedb generate` command accepts connection options. If fully defined (e.g. `dsn` exists, or `port+host` exists, etc), these are passed explicitly to `edgedb-js`.

Else, check root directory for `.env` file, parse it, and merge into `process.env`. The `npx` command will also accept an optional `--env` argument that points to a `*.env` file to be parsed.

Then attempt connection, relying on the resolution of `edgedb-js`.

### Generation

Identity project root:

1. Search up the file system for nearest node_modules folder
2. If `.pnpm` is inside, follow `edgedb` symlink.
3. if `.pnp.cjs`, throw error. Codegen is incompatible with global module caching. Prisma doesn't support this either: https://github.com/prisma/prisma/issues/1439

Compute generation location:

```js
// outputRelativePath defaults to `node_modules/.edgedb`
// it can be set with the `--output` CLI argument
const outputPath = path.join(projectRoot, outputRelativePath);
```

Generate TS files into temporary directory:

`{project_root}/node_modules/.edgedb_temp`

Use the [Compiler API](https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API) to generate `.js/.d.ts` files:

- JS: `{outputPath}/*.js`
- DTS: `{outputPath}/*.d.ts`

The contents of `.edgedb` are re-exported from `edgedb-js/queryBuilder/index.ts`

### Other ideas

- Re-generate in `postinstall` hook?
- Re-generate after `edgedb migration`?

## Usage

### Importing

```ts
import e from "edgedb/queryBuilder";

const myQuery = e.select(/* ... */);
```

### Execution

Top-level statements (for, select, insert, update, delete, with) have a `.query` method with the following signature:

```ts
myQuery.query(connection: Connection | Pool | Transaction, args: Args): Promise<T>
```

The type of `Args` is inferred from `myQuery`.

## Conflicts

All types, functions, and operators are generated into a single file and properly namespaced:

```ts
e.std.array_unpack;
e.default.User;
e.math.floor;
e.sys.get_version;
e.cal.datetime;
```

The `std` and `default` modules are also exposed as top-level functions for convenience:

```ts
e.len;
e.eq;
e.Hero;
```

If there are any name conflicts (e.g. a user-defined module called `len`) then the generation script will forgo aliasing `e.std.len` to `e.len`.

## Literals

These will be rendered as EdgeQL string literals.

```ts
e.str("234"); // naked string literals supported where possible
e.int64(123);
e.float64(1234.1234);
e.bool(true); // boolean literals supported where possible
e.bigint(12345n); // bigint literals supported where possible

e.decimal("1234.1234n");
e.datetime(new Date());
// same type signatures as edgedb-js constructors
e.localDate(1776, 07, 04);
e.localTime(13, 15, 0);
e.localDateTime(1776, 07, 04, 13, 15, 0);
e.duration(400, 5, 12, 1, 2, 3);
e.uuid("599236a4-2a5e-4249-91b6-ec435d3afe20");
e.json(JSON.stringify({asdf: 1234}));

e.default.CustomEnum.green;
```

## Sets and overloading

```ts
e.set(e.str("asdf"), e.str("qwer"));
// => {'asdf', 'qwer'}
```

Overload with support for naked strings.

```ts
e.set("asdf", "asdf");
// => {'asdf', 'qwer'}
```

Disallow incompatible types.

```ts
e.set(e.str("asdf"), e.int32(12)); // TypeError
```

Use overloading to represent implicit casting behavior

```ts
// allow distinct types that are implicitly castable
e.set(e.int16(1234), e.int64(1234));
// => Literal<Set<Int64>, number[]>

e.set(e.int64(1234), e.float32(12.34));
// => Literal<Set<Float64>, number[]>
```

For an empty set, pass a type as the first and only argument:

```ts
e.set(e.int64);
// => <std::int64>{}
```

## Arrays

```ts
e.array([e.str(5)]);
```

As with sets, heterogeneous compatible types are valid

```ts
e.array([e.int16(5), e.int64(51234)]);
```

## Tuples

```ts
e.tuple([e.str("Peter Parker"), e.int64(100)]);
```

With names:

```ts
e.tuple({
  name: e.str("Peter Parker"),
  age: e.int64(18),
});
```

## Literals of collection types

```ts
e.literal(e.array(e.str), ["asdf"]);
e.literal(e.tuple([e.str]), ["asdf"]);
e.literal(e.tuple([e.str]), ["asdf"]);
```

## Set references

### Object set references

Module-scoped set references.

```ts
e.default.Hero;
e.default.Villain;
e.default.Movie;
e.myModule.MyType;
```

### Deconstruction for convenience

```ts
const {Hero, Villain, Movie, Person} = e.default;
```

### Property set references

```ts
Hero.name;
Movie.title;
```

### Traverse links

```ts
Hero.villains;
Movie.characters;
```

### Type intersections

```ts
// Movie.characters[IS Hero]
Movie.characters.$is(e.Hero);
```

### Backward links

Provide backlinks that behave just like forward links:

```ts
Hero["<nemesis[IS default::Villain]"];
```

Also support "untyped" backlinks. By default, these return a set of `BaseObject` with cardinality `Many`. These can be refined with `$is` and `$assertSingle`.

```ts
e.Hero.['<nemesis'].$is(e.Villain);
```

## Casting

All types are available at the top-level. Returns `Expression<Set<CastedType>>`. This syntax is liable to change based on the underlying representation of the type system (not finalized).

```ts
e.cast(e.int16, e.int32(1255)); // <int16><int32>1255;
e.cast(e.UUID, e.str("ab1bcd81...")); // <uuid>'ab1bcd81...';
```

## Functions

All operators are available as overloaded functions at the top level.

## Operators

Operators are implements as top-level overloaded functions using the same approach used for functions.

## Select

### Scalars

```ts
e.select(e.int64(1243));
e.select(a.add(e.int64(2), e.int64(2)));
e.select(e.concat('aaaa', e.to_str(e.int64(111)));
```

### Free shapes

```ts
e.select({
  name: e.str("Name"),
  number: e.int64(1234),
  heroes: e.Hero,
});
```

### Object type select

Shape defaults to `{ id: true }`;

```ts
e.select(e.Hero); // select Hero { id };
```

### Shapes: object syntax

The scoped `hero` variable is a singleton-ified variant of the expression being SELECTed.

```ts
e.select(e.Hero, hero => ({
  id: 1 > 0, // optional
  name: true,
  villains: {
    id: true,
    name: true,
  },
}));
```

### Shapes: closure syntax

```ts
e.select(e.Hero, hero => ({
  id: 1 > 0, // optional
  name: true,
  villains: villain => ({
    id: true,
    name: true,
    name_upper: e.str_upper(villain.name),
  }),
}));
```

### Shapes: computables

```ts
e.select(e.Person, person => ({
  id: true,
  name: true,
  uppercase_name: e.str_upper(person.name),
  is_hero: e.is(person, e.Hero),
}));
```

Computables can share a key with an actual link/properties as long as the type signatures agree:

```ts
e.select(e.Hero, hero => ({
  id: true,
  name: e.str_upper(hero.name),
  villains: e.select(e.Villain, villain => ({
    id: true,
    name: true,
    filter: e.eq(e.len(hero.name), e.len(villain.name)),
  })),
}));
```

### Shapes: polymorphism

`e.is` returns a shape. The values should be of type `$expr_PolyShapeElement`, which keeps a reference to the polymorphic type. Inside `toEdgeQL`, when a `$expr_PolyShapeElement` is encountered, the key should be prefixed with the appropriate type intersection: `[IS Hero].secret_identity`, etc.

```ts
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
```

`e.is(Type, ref => Shape)`: `Shape` should not allow top-level computables, as this isn't valid EdgeQL:

### Basic filtering

```ts
e.select(e.Hero, hero => ({
  id: true,
  name: true,
  filter: e.or(e.ilike(hero.name, "%Man"), e.ilike(hero.name, "The %")))
}))
```

> Filters are checked to determine whether the result set should be a singleton or not.

### Nested filtering

```ts
e.select(e.Hero, hero => ({
  id: true,
  name: true,
  villains: villain => ({
    id: true,
    filter: e.like(villain.name, "Mr. %"),
  }),
  filter: e.eq(hero.name, e.str("Iron Man")),
}));
```

### Ordering

Simple:

```ts
e.select(e.Hero, hero => ({
  order: hero.name,
}));
```

Advanced:

```ts
e.select(e.Hero, hero => ({
  order: {
    expression: hero.name,
    direction: e.DESC,
    empty: e.EMPTY_FIRST,
  },
}));
```

Multiple ordering

```ts
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
```

### Pagination

```ts
e.select(e.Hero, hero => ({
  offset: e.len(hero.name),
  limit: 15,
}));
```

### Type intersection

```ts
// select Movie { characters[IS Hero]: { id }}
e.select(e.Movie, movie => ({
  characters: movie.characters.$is(e.Hero),
}));
```

To specify shape, use subqueries:

```ts
e.select(e.Movie, movie => ({
  id: true,
  characters: e.select(movie.characters.$is(e.default.Hero), hero => ({
    id: true,
    secret_identity: true,
  })),
}));
```

## Insert

```ts
e.insert(e.Movie, {
  title: "Spider-Man 2",
  characters: e.select(e.Person, person => ({
    filter: e.in(person.name, e.set("Spider-Man", "Doc Ock")),
  })),
});
```

### Conflicts

Simple

```ts
e.insert(e.Movie, {
  title: "Spider-Man 2",
}).unlessConflict();
```

Specify `ON`:

```ts
e.insert(e.Movie, {
  title: "Spider-Man 2",
}).unlessConflict(movie => ({
  on: movie.title, // can be any expression
}));
```

Specify `ON ... ELSE`

```ts
e.insert(e.Movie, {
  title: "Spider-Man 2",
}).unlessConflict(movie => ({
  on: movie.title,
  else: e.select(movie).update({
    title: "Spider-Man 2",
  }),
}));
```

## Update

```ts
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
```

## Delete

```ts
e.select(e.Hero, hero => ({
  filter: e.eq(hero.name, "Captain America"),
  order: ...,
  offset: ...,
  limit: ...
}))
  .delete();
```

## Detach

```ts
const detachedHero = e.detached(e.Hero);
```

## Parameters

```ts
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
```

## WITH clauses

During the query rendering step, the number of occurrences of each expression are tracked. All expressions that are referenced more than once and all orphan clauses are extracted into a top-level WITH block.

```ts
const a = e.set(e.int64(1), e.int64(2), e.int64(3));
const b = e.alias(a);

e.select(e.plus(a, b)).toEdgeQL();
// WITH
//   a := {1, 2, 3},
//   b := a
// SELECT a + b
```

```ts
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
```

To embed `WITH` statements inside queries, you can short-circuit this logic with a "dependency list". It's an error to pass an expr to multiple `e.with`s, and an error to use an expr passed to `e.with` outside of that WITH block in the query.

We add a top level e.alias() function. This will create an alias of the expr passed to it in a WITH block.

```ts
return e.select(
  e.with(
    [newHero, newVillain], // list "dependencies";
    e.select(newVillain, {
      id: true,
      name: true,
    })
  )
);
```

## FOR ... IN

As the `Set` class (described under "Type System") has a `cardinality` property, we're able to represent singleton cardinality inside a FOR/IN loop.

```ts
e.for(e.set("1", "2", "3"), number => {
  // do stuff
});

e.for(e.Hero, hero => {
  // do stuff
});
```

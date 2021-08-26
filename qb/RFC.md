# Query builder pre-RFC

## Generation

Generation logic should live inside inside edgedb-js so the generation logic is versioned alongside the driver.

### Command

`npx edgedb generate`

### Connection

- The `npx` command accepts connection options which take first precedence
- Any `.env` file in the root directory is parsed and added to `process.env`. Perhaps the `npx` command can also accept a flag `--env` that points to an environment variable that should be parsed.
- The connection is attempted with no configuration passed to `edgedb-js`, relying on the resolution of `edgedb-js`
- If connection fails, throw error

### Folder resolution

1. find nearest node_modules folder
2. if `.pnpm` is inside, follow `edgedb` symlink
3. if `.pnp.cjs`: throw (Prisma doesn't support currently)

- read .env files?
- generate into node_modules/.edgedb
- post-install
- regenerate after migration?

### Generation output

Option 1: Generate into `node_modules/.edgedb` and re-export from inside the `edgedb` module. This is what Prisma does. This means the query builder typically won't be checked into version control.

Option 2: Generate to a file/directory in the local project, e.g. `./generated/edgedb.ts`. This can be customizable.

### Delegation

The `edgedb` CLI command should scan for a package.json containing `edgedb`.

1. If found, it should delegate the generation step to the installed package. It will pass the connection options to the package as arguments.
2. If a package.json is discovered but edgedb isn't installed, it can be auto-installed.
3. If the command wasn't executed inside a JS package (no `package.json` in any ancestor), error.

### Executable

The `edgedb` module can contain an executable `generate` command exposed via package.json ["bin"](https://docs.npmjs.com/cli/v7/configuring-npm/package-json#bin). Users could optionally call the package's CLI directly with `npx edgedb generate`. This doesn't causes clashes with globally installed CLIs, as `npx` doesn't look at the global path.

### Output location

Generate definitions into `node_modules/.edgedb` and re-export from `node_modules/edgedb/index.js`. This is what Prisma does.

- Keeps the generated code out of version control.
- Pro: This lets us define a bunch of TS code in the `edgedb` JS package, then reference it in the `generated` code, and the schema-specific artifacts can be generated to a particular spot in the package.

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

Named

```ts
e.tuple({
  name: e.str("Peter Parker"),
  age: e.int64(18),
});
```

Unnamed

```ts
e.tuple([e.str("Peter Parker"), e.int64(100)]);
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
Movie.characters.$is(Hero);
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

## Select

### Scalars

```ts
e.select(e.int64(1243));
e.select(a.add(e.int64(2), e.int64(2)));
e.select(e.concat('aaaa', e.to_str(e.int64(111)));
```

### Simple select

Shape defaults to `{ id: true }`;

```ts
e.select(Hero);
// Select Hero;
```

### Object-defined shape

```ts
e.select(Hero, {
  id: 1 > 0, // optional
  name: true,
  villains: {
    id: true,
    name: true,
  },
});
```

### Free shapes

```ts
e.select({
  name: e.str("Name"),
  number: e.int64(1234),
  heroes: e.Hero,
});
```

### Basic filtering

```ts
e.select(Hero, {
  id: true,
  name: true,
})
  .filter(e.or(e.ilike(Hero.name, "%Man"), e.ilike(Hero.name, "The %")))
  .filter(e.ilike(Hero.secret_identity, "Peter%"));
```

> Filters are checked to determine whether the result set should be a singleton or not.

### Nested filtering

```ts
e.select(Hero, {
  id: true,
  name: true,
  villains: e
    .select(Villain, {
      id: true,
      name: true,
    })
    .filter(e.eq(e.len(Hero.name), e.len(Villain.name))),
}).filter(e.eq(Hero.name, e.str("Iron Man")));
```

### Type intersection

```ts
e.select(Hero, {
  villains: (() => {
    const villains = Hero.villains.$is(Subvillain);
    return e
      .select(villains, {
        id: true,
        name: true,
      })
      .filter(e.eq(e.len(Hero.name), e.len(villains.name)));
  })(),
}).filter(e.eq(Hero.name, e.str("Iron Man")));
```

Explicit WITH

```ts
e.select(Hero, {
  id: true,
  name: true,
  villains: e.with(
    {
      villains: Hero.villain.$is(Subvillain),
    },
    (ctx) =>
      e
        .select(ctx.villains, {
          id: true,
          name: true,
        })
        .filter(e.eq(e.len(Hero.name), e.len(villains.name)))
  ),
}).filter(e.eq(Hero.name, e.str("Iron Man")));
```

- path expressions are inlined
- statements are inlined if used only once
- statements referenced more than once require explicit WITH

### Computables

```ts
const Person = e.default.Person;

e.select(Person, {
  id: true,
  name: true,
  uppercase_name: e.str_upper(Person.name),
  is_hero: e.is(Person, e.default.Hero),
});
```

### Polymorphism

Option 1: variadic shape arguments.

```ts
e.select(
  Person,
  {
    id: true,
    name: true,
  },
  e.is(Hero, {
    secret_identity: true,
    villains: {
      id: true,
      name: true,
    },
  }),
  e.is(Villain, {
    nemesis: {id: true},
  })
);
```

Potential ambiguity:

```
SELECT Movie.characters[IS Hero];
SELECT Movie.characters IS Hero;
```

### Type intersection

```
SELECT Movie {
  id,
  characters[IS Hero]: {
    id, secret_identity
  }
}
```

Use subqueries:

```ts
e.select(Movie, {
  id: true,
  characters: e.select(Movie.characters.$is(e.default.Hero), {
    id: true,
    secret_identity: true,
  }),
});
```

### Paths

Links

```ts
e.select(Hero.villains, {
  id: true,
});
```

Properties

```ts
const name = e.default.Hero.name;
e.select(name).filter(e.eq(name, "Iron Man")).orderBy(e.len(name));
```

### Ordering

```ts
e.select(Hero).orderBy(Hero.name);
e.select(Hero).orderBy(Hero.name, e.ASC);
e.select(Hero).orderBy(Hero.name, e.ASC, e.EMPTY_LAST);
```

### Multiple ordering

```ts
e.select(Hero, {
  name: true,
})
  .orderBy(Hero.name, e.DESC, e.EMPTY_FIRST)
  .orderBy(Hero.secret_identity, e.ASC, e.EMPTY_LAST);

`SELECT Hero
  ORDER BY .name DESC EMPTY LAST
  THEN .secret_identity ASC EMPTY LAST`;
```

### Pagination

```ts
e.select(Hero).offset(e.len(Hero.name)).limit(15);
```

No chained `offset` or `limit`

```ts
e.select(Hero).offset(e.len(Hero.name)).offset(15); // TypeError
```

## Insert

```ts
const Movie = e.default.Movie;
const Person = e.default.Person;

e.insert(Movie, {
  title: "Spider-Man 2",
  characters: e
    .select(Person)
    .filter(e.in(Person.name, e.set("Spider-Man", "Doc Ock"))),
});
```

### Conflicts

```ts
e.insert(Movie, {
  title: "Spider-Man 2",
  characters: e
    .select(Person)
    .filter(e.in(Person.name, e.set("Spider-Man", "Doc Ock"))),
}).unlessConflict(
  Movie.title, // can be any expression
  e.select(Movie).update({
    "+=": {
      characters: e
        .select(Person)
        .filter(e.in(Person.name, e.set("Spider-Man", "Doc Ock"))),
    },
  })
);
```

## Update

```ts
// update method
e.select(Movie)
  .filter(e.eq(Movie.title, e.str("Avengers 4")))
  .orderBy(/**/)
  .offset(/**/)
  .update({
    set: {
      title: e.str("Avengers: Endgame"),
    },
    add: {
      characters: e.set(e.select(Hero), e.select(Villain)),
    },
    remove: {
      characters: e
        .select(Villain)
        .filter(e.eq(villain.name, e.str("Thanos"))),
    },
  });
```

## Delete

```ts
e.select(Hero)
  .filter(e.eq(Hero.name, "Captain America"))
  .orderBy(/**/)
  .offset(/**/)
  .limit(/**/)
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
    optionalStr: e.optional(e.bool),
  },
  (args) =>
    e
      .select(Person, {
        id: true,
        optionalStr,
      })
      .filter(e.in(Person.name, e.array_unpack(args.name)))
);
```

## WITH clauses

During the query rendering step, the number of occurrences of each expression are tracked. All expressions that are referenced more than once and all orphan clauses are extracted into a top-level WITH block.

```
const a = e.set(e.int64(1), e.int64(2), e.int64(3));
const b = e.alias(a);

e.select(e.plus(a, b)).toEdgeQL();
// WITH
//   a := {1, 2, 3},
//   b := a
// SELECT a + b
```

```ts
const newHero = e.insert(Hero, {
  name: "Batman",
});

const newVillain = e.insert(Villain, {
  name: "Dr. Evil",
  nemesis: newHero,
});

return e.select(newVillain, {
  id: true,
  name: true,
});
```

To embed `WITH` statements inside queries, you can short-circuit this logic with a "dependency list". It's an error to pass an expr to multiple `e.with`s, and an error to use an expr passed to `e.with` outside of that WITH block in the query.

We add a top level e.alias() function - this will create an alias of the expr passed to it in a WITH block, eg.

```ts
return e.select(
  e
    .with(newHero, newVillain) // list "dependencies"
    .select(newVillain, {
      id: true,
      name: true,
    });
)
```

## FOR IN

As the `Set` class (described under "Type System") has a `cardinality` property, we're able to represent singleton cardinality inside a FOR/IN loop.

```ts
e.for(e.set("1", "2", "3"), (number) => {
  // do stuff
});

e.for(Hero, (hero) => {
  // do stuff
});
```

## Type declarations

```ts
e.decimal(15);
e.cast(e.decimal, 14);

e.tuple([e.int16, e.str]); // tuple<int16, str>
e.tuple([e.int16(0), e.str("asdf")]); // ('0', 'asdf')
e.tuple([Hero, Villain]); // ???
```

## Casting

All types are available at the top-level. Returns `Expression<Set<CastedType>>`. This syntax is liable to change based on the underlying representation of the type system (not finalized).

```ts
e.cast(e.int16, e.int32(1255)); // <int16><int32>1255;
e.cast(e.UUID, e.str("ab1bcd81...")); // <int16>len(Hero.name);
```

## Functions

All operators are available as overloaded functions at the top level.

```ts
type AnyExpression = Expression<Set<any>, any>>;

class Len<Arg extends AnyExpression> extends Expression<Set<Int64, Arg["__cardinality"]>, number>{
  _expr: Arg;
}

function len<T extends Expression<Set<Bytes>, any>>(arg: T): Len<T>;
function len<T extends Expression<Set<Str>, any>>(arg: T): Len<T>;
function len<T extends Expression<Set<Array<any>>, any>>(arg: T): Len<T>;
function len(arg: any) {
  return new Len(arg) as any;
}

len(e.str("asdasdf"));
```

The overload enforces that `len` only accepts sets of `Bytes`, `Str`, or `Array` types. Also, the cardinality of the output reflects the cardinality of the input.

A class will be generated for each custom function in the schema.

## Operators

Operators are implements as top-level overloaded functions using the same approach used for functions.

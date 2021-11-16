# Query builder

## Project setup

1. Set up

```
yarn
```

2. Initialize project inside `qb`

```
cd qb
edgedb server upgrade --nightly
edgedb project init
yarn
```

3. Generate query builder

The files inside `qb` import from the _built_ files in `edgedb-js/src`. So run `yarn build` in the root directory first.

```sh
$ yarn build
```

The run `yarn generate` anywhere inside `edgedb-js` or `edgedb-js/qb`. Files are generated into `qb/dbschema/edgeql`.

```
yarn generate

// watch mode
yarn generate:dev
```

4. Scratchpad: `qb/playground.ts`

Run `yarn play` inside `edgedb-js/qb` to execute `qb/playground.ts` in watch mode. This is an easy way to test things in development.

⚠️ All imports from `"edgedb"` resolve to the symlinked version of `edgedb-js`. This imports the _built_ library, not the so you need to re-run `yarn build` inside `edgedb-js` for changes to be reflected in your playground code. Running the `yarn build:dev` watcher inside the root `edgedb-js` directory is an easy way to rebuild the project anytime you make a change.

5. Tests

Inside `qb`:

```
yarn test
```

## File structure

- `src/reflection`: Most introspection and type logic is implemented in `edgedb-js/src/reflection`
  - `reflection/typesystem.ts`: Implements the foundational structure/logic of the entire typesystem. Very important.
  - `reflection/queries`: Subdirectory containing introspection queries
  - `reflection/generators`: Subdirectory containing code generation logic
  - `reflection/util`: Various utils
- `src/syntax`: All top-level syntactic structures are declared in this directory: literals, `set`, `cast`, `select`, etc. The contents of this directory are copied into the generated query builder. For all code inside `src/syntax`:
  - To import something from `src/reflection`, use the `"reflection"` path alias.
  - To import something from the generated code, use the `"@reflection/*"` alias.
  - This is important, becauase these imports are rewritten with a simple find/replace when the `syntax` files are copied over into `qb/dbschema/edgeql`. See `generate.ts` for details.
- `qb`: A directory added to make query builder development easier. It is an EdgeDB project containing a sample schema.
  - `qb/run.ts`: The script that generates the query builder. Delegates to generate.ts.
  - `qb/generate.ts`: The script that generates the query builder.
  - `qb/tests`: Directory containing QB tests.
  - `qb/dbschema/edgeql`: The query builder is generated into this directory. This path is hard-coded in `run.ts`.
  - `qb/dbschema/edgeql/modules/{MODULE_NAME}`: The contents of each module is generated into an appropriately named file.
  - `qb/dbschema/edgeql/syntax`: Modified versions of the files in `src/syntax/*` are generated into this File
  - `qb/dbschema/edgeql/__spec__.ts`: A "dehydrated" representation of all types in the database, including all metadata and inheritance info. These types are "hydrated" by the `makeType` function in `src/reflection/hydrate.ts`, which produces a statically typed

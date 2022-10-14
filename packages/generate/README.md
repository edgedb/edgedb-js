# `@edgedb/generate`: Code generation tools for EdgeDB

The `@edgedb/generate` package implements a set of code generation tools that are useful when developing an EdgeDB-backed applications with TypeScript/JavaScript.

✨ [View Documentation >>](https://www.edgedb.com/docs/clients/js/generation)

## Installation

> If you're using Deno, you can skip this step.

Install the `edgedb` package.

```bash
$ npm install edgedb       # npm users
$ yarn add edgedb          # yarn users
```

Then install `@edgedb/generate` as a dev dependency.

```bash
$ npm install @edgedb/generate --save-dev      # npm users
$ yarn add @edgedb/generate --dev              # yarn users
```

## Run a generator

Run a generator with the following command.

**Node.js**

```bash
$ npx @edgedb/generate <generator> [options]
```

**Deno**

```bash
$ deno run --allow-all --unstable https://deno.land/x/edgedb/generate.ts <generator> [options]
```

The value of `<generator>` should be one of the following.

- `queries`: This generator scans your project for `*.edgeql` files and generates a file containing a strongly-typed function for each.
- `edgeql-js`: This generator introspects your database schema and generates a query builder.
- `interfaces`: This generator introspects your database schema and generates TypeScript interfaces for each object type.

## Third-party generators

✨ If you build a code generator for EdgeDB, ping us or open a PR and we'll list it here! ✨

The `edgedb` package exports a set of utilities to introspect the schema and analyze queries. We use these tools to implement our

## Contributing

If you want to implement a code generator, please open an issue first. This package only contains first-party generators with widespread appeal. From the root directory:

```
yarn
yarn workspaces run build  # build all packages
```

Navigate into `packages/generate`:

Build `@edgedb/generate`

```
yarn build
```

Build without typechecking (uses `esbuild`):

```
yarn build:fast
```

Run a generator:

```
npx @edgedb/generate edgeql-js    # query builder
npx @edgedb/generate queries      # query files
```

Execute `playground.ts` (uses `tsx`). Useful for testing things quickly in development:

```
yarn play
```

> ⚠️ All imports from `"edgedb"` resolve to the local build version of the driver in `packages/driver/dist`. This imports the _built_ library, not the so you need to re-run `yarn workspace edgedb build` for changes to be reflected in your playground code. Run `yarn dev` watcher inside `packages/driver` to rebuild the project anytime you make a change.

Run commands in watch mode. Useful when in development. The following command rebuilds the package and executes the playground whenever a file change is detected.

```
yarn watch 'yarn build:fast && yarn play`
```

Run tests. All `test:*` scripts are self-contained, in that they execute any prerequisite generation steps before running any tests.

```
yarn test         # runs all tests (listed below)
yarn test:ts
yarn test:esm
yarn test:cjs
yarn test:mts
yarn test:deno
```

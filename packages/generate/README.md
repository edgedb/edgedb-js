# Query builder

## Project setup

1. Set up

```
yarn
```

2. Build all project

```
yarn workspaces run build
```

3. Generate query builder

Run `yarn generate` from `packages/generate` to generate the query builder. Files are generated into `packages/generate/dbschema/edgeql-js`.

```
$ cd packages/generate
$ yarn generate

// watch mode
yarn generate:dev
```

4. Scratchpad: `packages/generate/playground.ts`

Run `yarn play` inside `packages/generate` to execute `packages/generate/playground.ts` (or `yarn play:dev` for watch mode). This is an easy way to test things in development.

⚠️ All imports from `"edgedb"` resolve to the local build version of the driver in `packages/driver/dist`. This imports the _built_ library, not the so you need to re-run `yarn build` inside `packages/driver` for changes to be reflected in your playground code. Run `yarn dev` watcher inside `packages/driver` to rebuild the project anytime you make a change.

5. Tests

To run `yarn test` inside each project.

```
yarn workspaces run test
```

## Packages

- `packages/driver`: The `edgedb` NPM package. Implements the client library.
  - `./src/reflection`: Most introspection and type logic is implemented in `edgedb-js/src/reflection`
  - `./src/syntax`: All top-level syntactic structures are declared in this directory: literals, `set`, `cast`, `select`, etc. The contents of this directory are copied into the generated query builder. For all code inside `src/syntax`:
- `packages/generate`: The `@edgedb/generate` NPM package. Implements code generation tools (query builder, `*.edgeql`, etc)
- `packages/deno`: The directory where the auto-generated `deno.land/x/edgedb` package is generated into. Both the driver and codegen tools are generated into this module.
- `packages/edgeql-js`: This is a package that prints an informative error message when `npx edgeql-js` is executed without `edgedb` installed.

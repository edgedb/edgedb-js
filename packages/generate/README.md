# Generators

## Project setup

From the root directory:

```
yarn
yarn workspaces run build  # build all packages
```

Navigate into `packages/generate`.

Build `@edgedb/generate`

```
yarn build
```

Build without typechecking (uses `esbuild`)

```
yarn build:fast
```

Run a generator:

```
yarn generate edgeql-js    # query builder
yarn generate queries      # query files
```

Execute `playground.ts` (uses `tsx`). Useful for testing things quickly in development.

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

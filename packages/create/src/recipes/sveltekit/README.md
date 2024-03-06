# Sveltekit Integration Recipe for EdgeDB

This recipe provides a starting point for building a [Svelteki](https://kit.svelte.dev/) application with EdgeDB as the database.

We try to actively monitor and incorporate significant changes from the original "create-app" templates to ensure developers have access to the latest features and best practices. However, we might not cover every possible configuration or permutation due to the vast scope of possibilities.

✨ Check out the [`@edgedb/create` package](https://github.com/edgedb/edgedb-js/blob/master/packages/create/README.md) for more information.

## Usage

```bash
$ npm create @edgedb
# or
yarn create @edgedb
# or
pnpm create @edgedb
# or
bun create @edgedb
```

After running the command, you will be prompted to provide a project name and choose the **"Sveltekit"** template. You can also specify whether to use EdgeDB Auth, initialize a git repository, and install dependencies.

The tool will then create a new directory with the specified name and set up the project.

## Local Recipe Development

Install dependencies in the root directory:

```bash
$ yarn
```

Navigate into `packages/create`:

```bash
$ cd packages/create
```

Build @edgedb/create

```bash
$ yarn build
```

Run a local version:

```bash
$ yarn run create
```

Then choose the **"Sveltekit"** template.

# Express Integration Recipe for EdgeDB

This recipe provides a starting point for building an [Express](https://expressjs.com/) application with EdgeDB as the database.

We try to actively monitor and incorporate significant changes from the original "create-app" templates to to ensure developers have access to the latest features and best practices.

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

After running the command, you will be prompted to provide a project name and choose the **"Express"** template. You can also specify whether to use EdgeDB Auth, initialize a git repository, and install dependencies.

The tool will then create a new directory with the specified name and set up the project.

### Local Recipe Development

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
$ yarn create
```

Then choose the **"Express"** template.

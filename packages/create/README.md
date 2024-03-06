# `@edgedb/create`: Project scaffolding for EdgeDB-backed applications

The `@edgedb/create` package provides a starting point for various frameworks with everything you need to start building an EdgeDB-backed application. We aim to follow the same conventions as the original "create-app" templates, but with EdgeDB as the database. There are a few different templates to choose from, including: Next.js, Remix, Express, Node HTTP Server.

Important points to note:

- **Upstream changes:** We try to actively monitor and incorporate significant changes from the original "create-app" templates to to ensure developers have access to the latest features and best practices.
- **Support for major options:** While we strive to support the major options offered by the upstream "create-apps", we might not cover every possible configuration or permutation due to the vast scope of possibilities.
- **EdgeDB CLI installation:** For users who do not have the EdgeDB CLI installed, we automatically install it using our typical installation procedure.

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

After running the command, you will be prompted to provide a project name and choose a template. You can also specify whether to use EdgeDB Auth, initialize a git repository, and install dependencies.

The tool will then create a new directory with the specified name and set up the project.

## Contributing

If you want to add a new template, please open an issue first. We are open to new ideas and would love to hear your feedback.

### Development

Install dependencies in the root directory:

```bash
$ yarn
```

Navigate into `packages/create`:

```bash
$ cd packages/create
```

Build `@edgedb/generate`

```bash
$ yarn build
```

Run a local version:

```bash
$ yarn run create
```

### Testing

```bash
$ yarn test
```

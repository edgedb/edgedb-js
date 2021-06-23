## Query builder dev instructions

1. Install deps

```
yarn
cd qb
yarn
```

2. Initialize project inside `qb`

```
cd qb
edgedb project init
cd ..
```

3. Symlink edgedb-js to `qb`

```
yarn link
cd qb
yarn link "edgedb"
```

4. Start edgedb-js watcher

In `edgedb-js` root:

```
yarn build:dev
```

5. Generate query builder

```
yarn generate

// watch mode
yarn generate:dev
```

Files are generated into `qb`

6. Scratchpad: `qb/playground.ts`

This file uses the symlinked version of `edgedb-js`, which is _built_ version of edgedb-js. You need to re-run `yarn build` for any changes to `edgedb-js` to be reflected in your playground code. Running the `yarn build:dev` watcher is an easy way to rebuild the project anytime you make a change.

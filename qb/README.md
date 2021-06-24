# Query builder

## Todo

- [ ] Add link properties to generateObjectTypes
- [ ] Implement Set
- [ ] Implement mixinPath function
- [ ] Implement Literal and literal constructors (`e.str`, `e.duration`)
- [ ] Implement `e.set` constructor
- [ ]

## Project setup

1. Set up

```
yarn
yarn link
```

2. Initialize project inside `qb`

```
cd qb
edgedb server upgrade --nightly
edgedb project init
yarn link "edgedb"
yarn
```

3. Generate query builder

Run `yarn generate` anywhere inside `edgedb-js` or `edgedb-js/qb`. Files are generated into `qb/generated`.

```
yarn generate

// watch mode
yarn generate:dev
```

4. Scratchpad: `qb/playground.ts`

Run `yarn play` inside `edgedb-js/qb` to execute `qb/playground.ts` in watch mode. This is an easy way to test things in development.

All imports from `"edgedb"` resolve to the symlinked version of `edgedb-js`. This imports the _built_ library, not the so you need to re-run `yarn build` inside `edgedb-js` for changes to be reflected in your playground code. Running the `yarn build:dev` watcher inside the root `edgedb-js` directory is an easy way to rebuild the project anytime you make a change.

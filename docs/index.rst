.. _edgedb-js-intro:

===========================
EdgeDB TypeScript/JS Client
===========================

.. toctree::
   :maxdepth: 3
   :hidden:

   driver
   generation
   queries
   interfaces
   querybuilder
   literals
   types
   funcops
   parameters
   objects
   select
   insert
   update
   delete
   with
   for
   group
   reference

.. _edgedb-js-installation:


Installation
============

The database driver and optional (but recommended!) generators are published to
npm and deno.land, and can be installed with your package manager of choice.

.. tabs::

    .. code-tab:: bash
      :caption: npm

      $ npm install --save-prod edgedb          # database driver
      $ npm install --save-dev @edgedb/generate # generators

    .. code-tab:: bash
      :caption: yarn

      $ yarn add edgedb                 # database driver
      $ yarn add --dev @edgedb/generate # generators

    .. code-tab:: bash
      :caption: pnpm

      $ pnpm add --save-prod edgedb          # database driver
      $ pnpm add --save-dev @edgedb/generate # generators

    .. code-tab:: typescript
      :caption: deno

      import * as edgedb from "http://deno.land/x/edgedb/mod.ts";

Requirements
------------

We currently test with all LTS versions of Node with TypeScript v5.0.4, and Deno
1.30.x. TypeScript requires both ``"strict": true`` and ``"downlevelIteration":
true`` in your ``tsconfig.json``.

.. _edgedb-js-example:

Examples
========

The :ref:`Client class <edgedb-js-driver>` implements the core functionality
required to establish a connection to your database and execute queries. If you
prefer writing queries as strings, the Client API is all you need. However, we
also provide several powerful generators which, along with TypeScript, allow for
safe and powerful use of EdgeDB queries in your application.

In the following examples, we compare performing the same query manually vs with
the various generators.

.. tabs::

    .. code-tab:: typescript
      :caption: Query builder

      import * as edgedb from "edgedb";
      import * as e from "./dbschema/edgeql-js";

      const client = edgedb.createClient();

      const query = e.params({ ids: e.array(e.uuid) }, ({ ids }) =>
        e.select(e.Movie, (movie) => ({
          id: true,
          title: true,
          release_year: true,
          filter: e.op(movie.id, "in", e.array_unpack(ids)),
        }))
      );

      async function run() {
        await query.run(client, {
          ids: [
            '2053a8b4-49b1-437a-84c8-e1b0291ccd9f',
            '2053a8b4-49b1-437a-84c8-af5d3f383484',
          ],
        });
        // { id: string; title: string; release_year: number | null }[]
      }

      run();

    .. code-tab:: typescript
      :caption: Queries

      import * as edgedb from "edgedb";
      import { selectMovieByIds } from "./dbschema/queries";

      const client = edgedb.createClient();

      async function run(){
        await selectMoviesByIds(client, {
          ids: [
            '2053a8b4-49b1-437a-84c8-e1b0291ccd9f',
            '2053a8b4-49b1-437a-84c8-af5d3f383484',
          ],
        });
        // { id: string; title: string; release_year: number | null }[]
      }

      run();

    .. code-tab:: typescript
      :caption: Interfaces

      import * as edgedb from "edgedb";
      import fs from "node:fs/promises";
      import { User } from "./dbschema/interfaces";

      const client = edgedb.createClient();

      async function run(){
        const query = await fs.readFile(
          "./selectMoviesByIds.edgeql",
          {encoding: "utf8" }
        );
        await client.query<User>(query, {
          ids: [
            '2053a8b4-49b1-437a-84c8-e1b0291ccd9f',
            '2053a8b4-49b1-437a-84c8-af5d3f383484',
          ],
        });
        // User
      }

      run();

    .. code-tab:: typescript
      :caption: Client-only

      import * as edgedb from "edgedb";
      import fs from "node:fs/promises";

      const client = edgedb.createClient();

      async function run(){
        const query = await fs.readFile(
          "./selectMoviesByIds.edgeql",
          {encoding: "utf8" }
        );
        await client.query(query, {
          ids: [
            '2053a8b4-49b1-437a-84c8-e1b0291ccd9f',
            '2053a8b4-49b1-437a-84c8-af5d3f383484',
          ],
        });
      }

      run();

    .. code-tab:: edgeql
      :caption: EdgeQL

      select Movie {
        id,
        title,
        release_year,
      }
      filter .id in array_unpack(<set<uuid>>$ids);

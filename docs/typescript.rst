.. _edgedb-js-typescript:


TypeScript
===========

The ``query`` and ``querySingle`` methods are generic. Pass a type annotation
to these methods to retrieve a strongly typed result.

.. code-block:: ts

    import * as edgedb from "edgedb";

    interface User {
      id: string;
      name: string;
      dob: edgedb.LocalDate;
    }

    async function main() {

      const client = edgedb.createClient();

      // Select several Users
      let userSet = await client.query<User>(
        `select User {id, name, dob} filter .name ilike 'B%';`
      );

      userSet[0].name; // "Bob"


      // Select a single user
      const bob = await client.querySingle<User>(
        `select User {id, name, dob} filter .name = 'Bob' limit 1;`
      );

      bob.dob; // edgedb.LocalDate

    }

A TypeScript-native query builder for EdgeQL is currently under development.

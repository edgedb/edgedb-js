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

      const conn = await edgedb.connect("edgedb://edgedb@localhost/test");


      // Select several Users
      let userSet = await conn.query<User>(
        `SELECT User {id, name, dob} FILTER .name ILIKE 'B%';`
      );

      userSet[0].name; // "Bob"


      // Select a single user
      const bob = await conn.querySingle<User>(
        `SELECT User {id, name, dob} FILTER .name = 'Bob' LIMIT 1;`
      );

      bob.dob; // edgedb.LocalDate

    }

A TypeScript-native query builder for EdgeQL is currently under development.

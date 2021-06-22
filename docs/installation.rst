.. _edgedb-js-installation:


Installation
============

To install EdgeDB driver with **npm** use:

.. code-block:: bash

    $ npm install edgedb

To install EdgeDB driver with **yarn** use:

.. code-block:: bash

    $ yarn add edgedb

To use with **Deno**, import from ``mod.ts`` (all the public api is exported
from here):

.. code-block:: typescript

    import * as edgedb from "https://deno.land/x/edgedb/mod.ts";

    // It is recommended to import a specific tagged version. eg:
    import * as edgedb from "https://deno.land/x/edgedb@0.14.0/mod.ts";

Deno permissions
----------------

If using Deno, the following permission flags may be required:

* ``--allow-net`` (required):
  This permission is required to connect to EdgeDB instances.

* ``--allow-env`` (optional):
  Needed if connecting using environment variables, or with an instance name
  (to find the directory where the instance credentials are stored).

* ``--allow-read`` (optional):
  Needed if connecting with an instance name, to read the instance credentials
  file.

Building from source
--------------------

If you want to build the EdgeDB driver from a Git checkout you will need:

* Node.js 10 or above.
* TypeScript compiler.
* yarn package manger.

Once the above requirements are satisfied, run the following command
in the root of the source checkout:

.. code-block:: bash

    $ yarn


Running tests
-------------

The testsuite requires a working local installation of the EdgeDB server.
To execute the testsuite run:

.. code-block:: bash

    $ yarn test

.. _edgedb-js-installation:


Installation
============

To install EdgeDB driver with **npm** use:

.. code-block:: bash

    $ npm install edgedb

To install EdgeDB driver with **yarn** use:

.. code-block:: bash

    $ yarn add edgedb


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

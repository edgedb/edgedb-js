.. _edgedb-js-delete:

Delete
------

Delete objects with ``e.delete``.

.. code-block:: typescript

  e.delete(e.Movie, movie => ({
    filter: ..,
    order_by: ...,
    offset: ...,
    limit: ...
  }));

The only supported keys are ``filter``, ``order_by``, ``offset``, and ``limit``.

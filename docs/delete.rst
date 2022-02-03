.. _edgedb-js-delete:

Delete
------

.. code-block:: typescript

  e.delete(e.Hero, hero => ({
    filter: ..,
    order_by: ...,
    offset: ...,
    limit: ...
  }));

The only supported keys are ``filter``, ``order_by``, ``offset``, and ``limit``.




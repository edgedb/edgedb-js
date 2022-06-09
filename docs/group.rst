.. _edgedb-js-group:

Group
=====

The ``group`` statement provides a powerful mechanism for categorizing a set of objects (e.g., movies) into *groups*. You can group by properties, expressions, or combinatations thereof.

Simple grouping
---------------

Sort a set of objects by a simple property.

.. tabs::

  .. code-tab:: typescript

    e.group(e.Movie, movie => {
      return {release_year: movie.release_year}
    });
    /* [
      {
        key: {release_year: 2008},
        grouping: ["release_year"],
        elements: [{id: "..."}, {id: "..."}]
      },
      {
        key: { release_year: 2009 },
        grouping: ["release_year"],
        elements: [{id: "..."}, {id: "..."}]
      },
      // ...
    ] */

  .. code-tab:: edgeql

    group Movie
    by .release_year

Group by a tuple of properties.

.. tabs::

  .. code-block:: typescript

    e.group(e.Movie, movie => {
      const release_year = movie.release_year;
      const first_letter = movie.title[0];
      return {release_year, first_letter};
    });
    /* [
      {
        key: {release_year: 2008, first_letter: "I"},
        grouping: ["release_year", "first_letter"],
        elements: [{id: "..."}, {id: "..."}]
      },
      // ...
    ] */

  .. code-tab:: edgeql

    group Movie
    using first_letter := .title[0]
    by .release_year, first_letter

Group using grouping sets.

.. tabs::

  .. code-block:: typescript

    e.group(e.Movie, movie => {
      const release_year = movie.release_year;
      const first_letter = movie.title[0];
      return e.group.set({release_year, first_letter});
    });
    /* [
      {
        key: {release_year: 2008},
        grouping: ["release_year"],
        elements: [...]
      },
      // ...
      {
        key: {first_letter: "I"},
        grouping: ["first_letter"],
        elements: [...]
      },
      // ..
    ] */

  .. code-tab:: edgeql

    group Movie
    using first_letter := .title[0]
    by {.release_year, first_letter}

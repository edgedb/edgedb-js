.. _edgedb-js-insert:

Insert
------

Insert new data with ``e.insert``.

.. code-block:: typescript

  e.insert(e.Movie, {
    title: e.str("Spider-Man: No Way Home"),
    release_year: e.int64(2021)
  });

For convenience, the second argument of ``e.insert`` function can also accept
plain JS data.

.. code-block:: typescript

  e.insert(e.Movie, {
    title: "Spider-Man: No Way Home",
    actors: e.select(e.Person, person => ({
      filter: e.op(person.name, "=", "Robert Downey Jr."),
      '@character_name': e.str("Iron Man")
    }))
  });


Link properties
^^^^^^^^^^^^^^^

As in EdgeQL, link properties are inserted inside the shape of a subquery.

.. code-block:: typescript

  const query = e.insert(e.Movie, {
    title: "Iron Man",
    actors: e.select(e.Person, person => ({
      filter_single: {name: "Robert Downey Jr."},
      "@character_name": e.str("Tony Stark")

      // link props must correspond to expressions
      "@character_name": "Tony Stark"  // invalid
    ))
  });


.. note::

  For technical reasons, link properties must correspond to query
  builder expressions, not plain JS data.

Similarly you can directly include link properties inside nested ``e.insert``
queries:

.. code-block:: typescript

  const query = e.insert(e.Movie, {
    title: "Iron Man",
    release_year: 2008,
    actors: e.insert(e.Person, {
      name: "Robert Downey Jr.",
      "@character_name": e.str("Tony Start")
    }),
  });

Handling conflicts
^^^^^^^^^^^^^^^^^^

In EdgeQL, "upsert" functionality is achieved by handling **conflicts** on
``insert`` statements with the ``unless conflict`` clause. In the query
builder, this is possible with the ``.unlessConflict`` method (available only
on ``insert`` expressions).

In the simplest case, adding ``.unlessConflict`` (no arguments) will prevent
EdgeDB from throwing an error if the insertion would violate an exclusivity
contstraint. Instead, the query returns an empty set (``null``).

.. code-block:: typescript

  e.insert(e.Movie, {
    title: "Spider-Man: No Way Home",
    release_year: 2021
  }).unlessConflict();
  // => null


Provide an ``on`` clause to "catch" conflicts only on a specific property/link.

.. code-block:: typescript

  e.insert(e.Movie, {
    title: "Spider-Man: No Way Home",
    release_year: 2021
  }).unlessConflict(movie => ({
    on: movie.title, // can be any expression
  }));


You can also provide an ``else`` expression which will be executed and returned in case of a conflict. You must specify an ``on`` clause in order to use ``else``.

The following query simply returns the pre-existing (conflicting) object.

.. code-block:: typescript

  e.insert(e.Movie, {
    title: "Spider-Man: Homecoming",
    release_year: 2021
  }).unlessConflict(movie => ({
    on: movie.title,
    else: movie
  }));

Or you can perform an upsert operation with an ``e.update`` in the ``else``.

.. code-block:: typescript

  e.insert(e.Movie, {
    title: "Spider-Man: Homecoming",
    release_year: 2021
  }).unlessConflict(movie => ({
    on: movie.title,
    else: e.update(movie, () => ({
      set: {
        release_year: 2021
      }
    })),
  }));


Bulk inserts
^^^^^^^^^^^^

It's common to  use for loops to perform bulk inserts. The raw data is passed
in as a ``json`` parameter, converted to a set of ``json`` objects with
``json_array_unpack``, then passed into a ``for`` loop for insertion.

.. code-block:: typescript

  const query = e.params({items: e.json}, (params) => {
    return e.for(e.json_array_unpack(params.items), (item) => {
      return e.insert(e.Movie, {
        title: e.cast(e.str, item.title),
        release_year: e.cast(e.int64, item.release_year),
      });
    });
  });

  const result = await query.run(client, {
    items: [
      {title: 'Deadpool', release_year: 2016},
      {title: 'Deadpool 2', release_year: 2018},
      {title: 'Deadpool 3', release_year: null},
    ]
  });

Here's a more complex example, demonstrating how to complete a nested insert
with conflicts on the inner items. First, take a look at the schema for this
database:

.. code-block:: sdl

    module default {
      type Character {
        required property name -> str {
          constraint exclusive;
        }
        property portrayed_by -> str;
        multi link movies -> Movie;
      }
      type Movie {
        required property title -> str {
          constraint exclusive;
        };
        property release_year -> int64;
      }
    }

Note that the ``Movie`` type's ``title`` property has an exclusive constraint.

Here's the data we want to bulk insert:

.. code-block:: js

    [
      {
        portrayed_by: "Robert Downey Jr.",
        name: "Iron Man",
        movies: ["Iron Man", "Iron Man 2", "Iron Man 3"]
      },
      {
        portrayed_by: "Chris Evans",
        name: "Captain America",
        movies: [
          "Captain America: The First Avenger",
          "The Avengers",
          "Captain America: The Winter Soldier",
        ]
      },
      {
        portrayed_by: "Mark Ruffalo",
        name: "The Hulk",
        movies: ["The Avengers", "Iron Man 3", "Avengers: Age of Ultron"]
      }
    ]

This is potentially a problem because some of the characters appear in the same
movies. We can't just naively insert all the movies because we'll eventually
hit a conflict. Since we're going to write this as a single query, chaining
``.unlessConflict`` on our query won't help. It only handles conflicts with
objects that existed *before* the current query.

Let's look at a query that can accomplish this insert, and then we'll break it
down.

.. code-block:: typescript

    const query = e.params(
      {
        characters: e.array(
          e.tuple({
            portrayed_by: e.str,
            name: e.str,
            movies: e.array(e.str),
          })
        ),
      },
      (params) => {
        const movies = e.for(
          e.op(
            "distinct",
            e.array_unpack(e.array_unpack(params.characters).movies)
          ),
          (movie) => {
            return (
              e.insert(e.Movie, {
                title: movie,
              })
              .unlessConflict((movie) => ({
                on: movie.title,
                else: movie,
              }))
            );
          }
        );
        return e.with(
          [movies],
          e.for(e.array_unpack(params.characters), (character) => {
            return e.insert(e.Character, {
              name: character.name,
              portrayed_by: character.portrayed_by,
              movies: e.assert_distinct(
                e.for(e.array_unpack(character.movies), (movieTitle) => {
                  return e.select(movies, () => ({
                    filter_single: { title: movieTitle },
                  }));
                })
              ),
            });
          })
        );
      }
    );

    await query.run(client, {
      characters: [{
          portrayed_by: "Robert Downey Jr.",
          name: "Iron Man",
          movies: ["Iron Man", "Iron Man 2", "Iron Man 3"],
        },
        {
          portrayed_by: "Chris Evans",
          name: "Captain America",
          movies: [
            "Captain America: The First Avenger",
            "The Avengers",
            "Captain America: The Winter Soldier",
          ],
        },
        {
          portrayed_by: "Mark Ruffalo",
          name: "The Hulk",
          movies: ["The Avengers", "Iron Man 3", "Avengers: Age of Ultron"],
        },
      ],
    });

We'll start with the ``e.params`` call.

.. code-block:: typescript

    const query = e.params(
      {
        characters: e.array(
          e.tuple({
            portrayed_by: e.str,
            name: e.str,
            movies: e.array(e.str),
          })
        ),
      },
      (params) => { ...

In raw EdgeQL, you can only have scalar types as parameters. We could mirror
that here with something like this: ``e.params({characters: e.json})``, but
this would then require us to cast all the values inside the JSON like
``portrayed_by`` and ``name``.

By doing it this way — typing ``characters`` with ``e.array`` and the character
objects as named tuples by passing an object to ``e.tuple`` — all the data in
the array will be properly cast for us.

.. code-block:: typescript

    ...
    (params) => {
      const movies = e.for(
        e.op(
          "distinct",
          e.array_unpack(e.array_unpack(params.characters).movies)
        ),
        (movie) => {
          return (
            e.insert(e.Movie, {
              title: movie,
            })
            .unlessConflict((movie) => ({
              on: movie.title,
              else: movie,
            }))
          );
        }
      );
    ...

We need to separate this movie insert query so that we can use ``distinct`` on
it. We could just nest an insert inside our character insert if movies weren't
duplicated across characters (e.g., two characters have "The Avengers" in
``movies``). Even though the query is separated from the character inserts
here, it will still be built as part of a single EdgeDB query using ``with``
which we'll get to a bit later.

The ``distinct`` operator can only operate on sets. We use ``array_unpack`` to
make these arrays into sets. We need to call it twice because
``params.characters`` is an array and ``.movies`` is an array nested inside
each character.

Chaining ``unlessConflict`` takes care of any movies that already exist in the
database *before* we run this query, but it won't handle conflicts that come
about over the course of this query. The ``distinct`` operator we used earlier
pro-actively eliminates any conflicts we might have had among this data.

.. code-block:: typescript

    ...
    return e.with(
      [movies],
      e.for(e.array_unpack(params.characters), (character) => {
        return e.insert(e.Character, {
          name: character.name,
          portrayed_by: character.portrayed_by,
          movies: e.assert_distinct(
            e.for(e.array_unpack(character.movies), (movieTitle) => {
              return e.select(movies, () => ({
                filter_single: { title: movieTitle },
              }));
            })
          ),
        });
      })
    );
    ...

The query builder will try to automatically use EdgeQL's ``with``, but in this
instance, it doesn't know where to place the ``with``. By using ``e.with``
explicitly, we break our movie insert out to the top-level of the query. By
default, it would be scoped *inside* the query, so our ``distinct`` operator
would be applied only to each character's movies instead of to all of the
movies. This would have caused the query to fail.

The rest of the query is relatively straightforward. We unpack
``params.characters`` to a set so that we can pass it to ``e.for`` to iterate
over the characters. For each character, we build an ``insert`` query with
their ``name`` and ``portrayed_by`` values.

For the character's ``movies``, we again call ``array_unpack`` to get
``character.movies`` as a set which we iterate over with ``e.for``, selecting
each movie from the ``movies`` insert query we wrote previously by using
``filter_single`` comparing the movie's ``title`` against the title in the
character's ``movies`` array, which we have named ``movieTitle``.

All that's left is to run the query, passing the data to the query's ``run``
method!

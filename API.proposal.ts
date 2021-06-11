/*

* `npx edgedb introspect` -- to introspect the schema and generate the code

  Would gerenerate a "schema" module in the project

*/

import * as e from "./schema";

//// Object-defined shape

e.select(e.default.Hero, {
  id: true,
  name: true,
  villains: {
    id: true,
    name: true,
  },
});

// OR

const d = e.default;

e.select(d.Hero, {
  id: true,
  name: true,
  villains: {
    id: true,
    name: true,
  },
});

// OR

const hero = e.default.Hero;

e.select(hero, {
  id: true,
  name: true,
  villains: {
    id: true,
    name: true,
  },
})(() => {
  const hero = e.default.Hero;

  e.select(hero, {
    id: true,
    name: true,
    villains: {
      id: true,
      name: true,
    },
  });
})();

///// Basic filtering

const hero = e.default.Hero;

e.select(hero, {
  id,
  name,
}).filter(
  e.eq(hero.name, "Iron Man") // or `e.arg('name')`
);

// OR

const def = e.default;

e.select(def.Hero, {
  id,
  name,
}).filter(
  e.eq(def.Hero.name, "Iron Man") // or `e.arg('name')`
);

///// Filtering

const Hero = e.default.Hero;
const Villain = e.default.Villain;

e.select(Hero, {
  id,
  name,
  villains: e
    .select(Villain, {
      id,
      name,
    })
    .filter(e.eq(e.len(Hero.name), e.len(Villain.name))),
}).filter(e.eq(Hero.name, e.str("Iron Man")));

///// Computables & args

const person = e.default.Person;

e.select(person, {
  id: true,
  name: true,
  uppercase: e.str_upper(person.name),
  is_hero: e.is(person, e.Hero),
}).filter(person.name, e.array_unpack(e.args("name", e.ARRAY(e.str))));

//// OR?

const fetchPerson = e.params(
  {
    name: e.ARRAY(e.str),
  },
  (args) =>
    e
      .select(person, {
        id: true,
        name: true,
        uppercase: e.str_upper(person.name),
        is_hero: e.is(person, e.Hero),
      })
      .filter(person.name, e.array_unpack(args.name))
);

apiHandler(() => {
  return await fetchPerson.limit(10).queryJSON({name: ["colin"]});
});

///// Polymorphism

const mod = e.default;

e.select(
  mod.Named,
  {
    name: true,
  },

  {
    email: true,
  },

  e.is(mod.Person, {
    secret_identity: true,
    villains: {
      id: true,
      name: true,
    },
  }),

  e.is(mod.Villain, {
    nemesis: true,
  })
);

//// Path reference

e.select(e.Hero.villains, {
  id: true,
});

//// Property reference

let data = (() => {
  const name = e.default.Hero.name;

  return e.select(name).filter(e.eq(name, "Iron Man")).orderBy(e.len(name));
})();

//// Advanced ordering

const q1 = e.select(hero, {
  name: true,
});

const q2 = q1
  .orderBy(hero.name, e.DESC, e.EMPTY_FIRST)
  .orderBy(hero.secret_identity, e.ASC, e.EMPTY_LAST);

//// Pagination

e.select(hero).offset(e.len(hero.name)).limit(15);

//// Insert

const Movie = e.default.Movie;
const Person = e.default.Person;

e.insert(Movie, {
  title: "Spider-Man 2",
  characters: e
    .select(Person)
    .filter(e.in(Person.name, e.set("Spider-Man", "Doc-Ock"))),
}).unlessConflict(
  [Movie.title],

  e.update(Movie, {
    title: "Spider-Man 2",
  })
);

//// With

let data = (() => {
  // const newHeroD = e.detached(e.default.Hero);

  const newHero = e.insert(e.default.Hero, {name: "Batman"});

  //  insert = function<T>(type: T, spec: S): qb.InsertReturn<ExtractRootType<T>, S>

  e.select(e.set(e.Hero, e.Villain));
  e.select(e.union(e.Hero, e.Villain));

  // newHero.unwrap().villains.name
  // newHero.orderBy(...)

  // newHero -> qb.InsertType{__root: e.default.Hero, __magicPayload}
  // newHero.xxx -> qb.SelectType{__root: newHero, __magicPayload:}
  // newHero.xxx.yyy -> SelectType{__root: newHero.xxx, __magicPayload:}

  const villain = e.insert(e.default.Villain, {
    name: "Dr. Evil",
    nemesis: [newHero],
  });

  return e.select(villain, {
    id: true,
    name: true,
  });
})();

// WITH
//   w1 := INSERT
// SELECT (
//   INSERT Villa (... w1)
// ) {
//   id, name
// }

///// OR, if we fail to implement the above:

let data = (() => {
  const newHero = e.insert(e.default.Hero, {name: "Batman"});
  const villain = e.insert(e.default.Villain, {
    name: "Dr. Evil",
    nemesis: [newHero],
  });

  return e
    .with(newHero, villain)
    .select(villain, {
      id: true,
      name: true,
    })
    .render();
})();

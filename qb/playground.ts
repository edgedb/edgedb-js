// tslint:disable:no-console
import {$} from "edgedb";
import type {$Movie} from "./dbschema/edgeql/modules/default";
import type {pointersToSelectShape} from "./dbschema/edgeql/syntax/select";

import e from "./dbschema/edgeql";
import {setupTests} from "./test/setupTeardown";

async function run() {
  // const asdf = e.tuple([e.str, e.int64]);
  const {client} = await setupTests();

  const backlinkQuery = await e.select(
    e.Hero["<characters"].$is(e.Movie),
    () => ({
      id: true,
      title: true,
    })
  );
  console.log(`QUERY`);
  console.log(backlinkQuery.toEdgeQL());
  const result = await backlinkQuery.run(client);
  console.log(result);

  if (1 > 0) return;

  console.log(`asdf`);

  console.log(e.Hero.__element__.__pointers__.villains.properties);

  console.log(await e.select(e.int16(5)).run(client));
  console.log(
    await e
      .select(e.Hero, hero => ({filter: e.eq(hero.name, e.str("Loki"))}))
      .run(client)
  );
  console.log(
    await e
      .select(e.Hero, hero => ({filter: e.eq(hero.name, e.str("Loki"))}))
      .update({number_of_movies: e.int16(5)})
      .run(client)
  );
  console.log(
    await e
      .select(e.Hero, hero => ({filter: e.eq(hero.name, e.str("Loki"))}))
      .delete()
      .run(client)
  );

  console.log(await e.insert(e.Hero, {name: e.str("Loki")}).run(client));
  console.log(
    await e
      .insert(e.Hero, {name: e.str("Loki")})
      .unlessConflict()
      .run(client)
  );

  console.log(await e.for(e.Hero, hero => hero.name).run(client));

  const numbers = e.set(e.int64(1), e.int32(2), e.int16(3));

  console.log(await e.with([numbers], e.select(numbers)).run(client));

  console.log(
    await e
      .withParams(
        {
          str: e.str,
          numArr: e.array(e.int64),
          optBool: e.optional(e.bool),
        },
        params =>
          e.select({
            str: params.str,
            nums: e.array_unpack(params.numArr),
            x: e.if_else(e.str("true"), params.optBool, e.str("false")),
          })
      )
      .run(client, {numArr: [7], str: "test"})
  );

  client.close();

  e.is(e.Villain, {
    // id: true,
    id: true,
    name: true,
    nemesis: hero => ({
      id: true,
      secret_identity: true,
      number_of_movies: true,
      "<nemesis[IS default::Villain]": {
        name: true,
      },
      order: hero.name,
    }),
  });

  type arg = pointersToSelectShape<typeof $Movie["__pointers__"]>;
  type moviepointers = $Movie["__pointers__"];
  type charfields = pointersToSelectShape<
    moviepointers["characters"]["target"]["__pointers__"] &
      moviepointers["characters"]["properties"]
  >;
  type charfield = charfields["@character_name"];

  const arg = e.is(e.Movie, {
    characters: char => ({
      "@character_name": true,
    }),
  });

  const arg2 = e.is(e.Movie, {
    characters: {
      "@character_name": true,
    },
  });

  const nested = e.select(e.Object, movie => ({
    id: true,
    ...e.is(e.Movie, {
      characters: {
        "@character_name": true,
      },
    }),
  }));
  const chars = nested.__element__.__shape__.characters;
  type nested = $.setToTsType<typeof nested>;

  console.log(nested.toEdgeQL());

  const q = e.select(e.Hero, hero => ({
    id: true,
    "<nemesis[IS default::Villain]": {
      id: true,
    },
  }));
  type q = $.setToTsType<typeof q>;

  const val1 = e
    .insert(e.Hero, {
      name: e.str("Pepper Potts"),
    })
    .unlessConflict();
  console.log(`\nVAL 1`);
  console.log(val1.toEdgeQL());

  const val2 = e
    .insert(e.Hero, {
      name: e.str("Pepper Potts"),
    })
    .unlessConflict(hero => ({on: hero.name}));
  console.log(`\nVAL 2`);
  console.log(val2.toEdgeQL());

  const val3 = e
    .insert(e.Hero, {
      name: e.str("Pepper Potts"),
    })
    .unlessConflict(hero => ({
      on: hero.name,
      else: e.select(hero, () => ({
        id: true,
        secret_identity: true,
      })),
    }));
  console.log(`\nVAL 3`);
  console.log(val3.toEdgeQL());

  const q3 = e.select(e.Hero, hero => ({
    id: true,
    q,
  }));
  type q3 = $.setToTsType<typeof q3>;
  const q4 = e.select(e.Person, person => ({
    id: true,
    q: q3,
    ...e.is(e.Hero, {
      secret_identity: true,
    }),
    ...e.is(e.Villain, {
      nemesis: {id: true, computable: e.int64(1234)},
      computable: e.int64(1234),
    }),
  }));
  type q4 = $.setToTsType<typeof q4>;
  const q5 = e.select(e.Hero, hero => ({
    id: true,
    q: q4,
    ...e.is(e.Villain, {
      // id: true,
      nemesis: {id: true},
      computable: e.int64(1234),
    }),
  }));
  type q5 = $.setToTsType<typeof q5>;
  const q6 = e.select(e.Hero, hero => ({
    id: true,
    q: q5,
    ...e.is(e.Villain, {
      nemesis: {id: true},
      computable: e.insert(e.Villain, {name: e.str("Loki")}),
    }),
  }));

  type q6 = $.setToTsType<typeof q6>;
  const q7 = e.select(e.Hero, hero => ({
    id: true,
    q: q6,
    ...e.is(e.Villain, {
      nemesis: {id: true},
      computable: e.select(
        e.insert(e.Villain, {name: e.str("Loki")}),
        villain => ({
          name: true,
          id: true,
        })
      ),
    }),
  }));
  type q7 = $.setToTsType<typeof q7>;
  const q8 = e.select(e.Hero, hero => ({
    id: true,
    q: q7,
    "<characters[IS default::Movie]": {
      title: true,
      characters: {
        "@character_name": true,
        name: true,
      },
      villainChars: e.select(e.Movie.characters).$is(e.Villain),
      heroCharNames: e.select(e.Movie.characters).$is(e.Hero).name,
    },
    ...e.is(e.Villain, {
      nemesis: {id: true},
      computable: e.insert(e.Person, {name: e.str("Loki")}),
    }),
  }));
  type q8 = $.setToTsType<typeof q8>;
  const q9 = e.select(e.Hero, hero => ({
    id: true,
    q: q8,
    ...e.is(e.Villain, {
      // id: true,
      nemesis: {id: true},
      computable: e.int64(1234),
    }),
  }));
  type q9 = $.setToTsType<typeof q9>;
  const q10 = e.select(e.Hero, hero => ({
    id: true,
    q: q9,
    ...e.is(e.Villain, {
      nemesis: {id: true},
    }),
  }));
  type q10 = $.setToTsType<typeof q10>;
  const q11 = e.select(e.Hero, hero => ({
    id: true,
    q: q10,
    computable: e.select(e.Hero),
  }));
  type q11 = $.setToTsType<typeof q11>;
  const q12 = e.select(e.Hero, hero => ({
    id: false,
    q: q11,
  }));
  type q12 = $.setToTsType<typeof q12>;
  const _q13 = e.select(e.Hero, hero => ({
    id: 1 > 0,
    q: q12,
  }));
  type _q13 = $.setToTsType<typeof _q13>;
}

run();
export {};

// tslint:disable:no-console
import {$Villain} from "@generated/modules/default";
import {setToTsType, shapeToSelectShape} from "reflection";
import e from "./generated/example";
import {setupTests} from "./test/setupTeardown";

async function run() {
  const asdf = e.tuple([e.str, e.int64]);
  await setupTests();

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

  // const q = e.select(e.Hero, hero => ({
  //   id: true,
  //   "<nemesis[IS default::Villain]": {
  //     id: true,
  //   },
  // }));
  // type q = setToTsType<typeof q>;

  // const q1 = e.select(e.Hero, hero => ({
  //   id: true,
  //   // name: true,
  //   q,
  //   ...e.is(e.Villain, {
  //     nemesis: {name: true},
  //   }),
  //   limit: 1,
  // }));

  // type q1 = setToTsType<typeof q1>;

  // const q2 = e.select(q1);
  // type q2 = setToTsType<typeof q2>;
  // console.log(q2.toEdgeQL());

  // const q3 = e.select(e.Hero, hero => ({
  //   id: true,
  //   q: q2,
  // }));
  // type q3 = setToTsType<typeof q3>;
  // const q4 = e.select(e.Person, person => ({
  //   id: true,
  //   q: q3,
  //   ...e.is(e.Hero, {
  //     secret_identity: true,
  //   }),
  //   ...e.is(e.Villain, {
  //     nemesis: {id: true, computable: e.int64(1234)},
  //     computable: e.int64(1234),
  //   }),
  // }));
  // type q4 = setToTsType<typeof q4>;
  // const q5 = e.select(e.Hero, hero => ({
  //   id: true,
  //   q: q4,
  //   // ...e.is(e.Villain, {
  //   //   id: true,
  //   //   nemesis: {id: true},
  //   //   computable: e.int64(1234),
  //   // }),
  // }));
  // type q5 = setToTsType<typeof q5>;
  // const q6 = e.select(e.Hero, hero => ({
  //   id: true,
  //   q: q5,
  //   ...e.is(e.Villain, {
  //     nemesis: {id: true},
  //     computable: e.insert(e.Villain, {name: e.str("Loki")}),
  //   }),
  // }));
  // type q6 = setToTsType<typeof q6>;

  // type adsf = shapeToSelectShape<typeof $Villain["__pointers__"], false>;

  // const arg = e
  //   .insert(e.Hero, {
  //     name: e.str("asdf"),
  //   })
  //   .unlessConflict();
  // const arg2 = e
  //   .insert(e.Hero, {
  //     name: e.str("asdf"),
  //   })
  //   .unlessConflict(hero => ({
  //     on: hero.name,
  //     else: hero,
  //   }));

  // const infer = <T extends {asdf: true}>(arg: T) => arg;
  // infer({asdf: true, qwer: "asdf"});
  // const q7 = e.select(e.Hero, hero => ({
  //   id: true,
  //   ...e.is(e.Villain, {
  //     nemesis: {id: true},
  //     computable: e.select(
  //       e.insert(e.Villain, {name: e.str("Loki")}),
  //       villain => ({
  //         name: true,
  //         id: true,
  //       })
  //     ),
  //   }),
  // }));
  // type q7 = setToTsType<typeof q7>;
  // const q8 = e.select(e.Hero, hero => ({
  //   id: true,
  //   q: q7,
  //   "<characters[IS default::Movie]": {
  //     title: true,
  //     characters: {
  //       "@character_name": true,
  //       name: true,
  //     },
  //     villainChars: e.select(e.Movie.characters).$is(e.Villain),
  //     heroCharNames: e.select(e.Movie.characters).$is(e.Hero).name,
  //   },
  //   ...e.is(e.Villain, {
  //     nemesis: {id: true},
  //     computable: e.insert(e.Person, {name: e.str("Loki")}),
  //   }),
  // }));
  // type q8 = setToTsType<typeof q8>;
  // const q9 = e.select(e.Hero, hero => ({
  //   id: true,
  //   q: q8,
  //   ...e.is(e.Villain, {
  //     // id: true,
  //     nemesis: {id: true},
  //     computable: e.int64(1234),
  //   }),
  // }));
  // type q9 = setToTsType<typeof q9>;
  // const q10 = e.select(e.Hero, hero => ({
  //   id: true,
  //   q: q9,
  //   ...e.is(e.Villain, {
  //     nemesis: {id: true},
  //   }),
  // }));
  // type q10 = setToTsType<typeof q10>;
  // const q11 = e.select(e.Hero, hero => ({
  //   id: true,
  //   q: q10,
  //   computable: e.select(e.Hero),
  // }));
  // type q11 = setToTsType<typeof q11>;
  // const q12 = e.select(e.Hero, hero => ({
  //   id: false,
  //   q: q11,
  // }));
  // type q12 = setToTsType<typeof q12>;
  // const _q13 = e.select(e.Hero, hero => ({
  //   id: true,
  //   q: q12,
  // }));
  // type _q13 = setToTsType<typeof _q13>;
}

run();
export {};

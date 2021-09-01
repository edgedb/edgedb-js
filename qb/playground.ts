// tslint:disable:no-console
import {
  BaseTypeToTsType,
  computeObjectShape,
  computeTsType,
  flatten,
  flattenShape,
  setToTsType,
} from "reflection";
import e from "./generated/example";
// import {setupTests, teardownTests} from "./test/setupTeardown";

async function run() {
  const heroset = e.set(e.Hero);
  const personset = e.set(e.Hero, e.Villain);

  // await teardownTests();
  // const {data, pool} = await setupTests();
  // const q1 = e
  //   .select(e.Villain)
  //   .filter(e.eq(e.Villain.name, e.str("Doc Ock")));
  // const q2 = e.select(e.Hero, {
  //   id: true,
  //   "<nemesis[IS default::Villain]": {name: true},
  //   subq: q1,
  // });
  // const q = e.select(e.str("asdf"));
  // type q = typeof q["__tstype__"];

  // const str = e.str("true" as string);
  // type str = setToTsType<typeof str>;
  const q = e.select(e.Hero, {
    id: true,
    "<nemesis[IS default::Villain]": {
      id: true,
    },
  });
  type q = setToTsType<typeof q>;

  const q1 = e
    .select(e.Hero, {
      id: true,
      q,
    })
    .limit(1);
  type q1 = setToTsType<typeof q1>;

  const q2 = e.select(q1);
  type q2 = setToTsType<typeof q2>;
  console.log(q2.toEdgeQL());

  // const q2 = e.select({
  //   id: e.str("true"),
  //   q: q1,
  // });
  // type el = typeof q2["__element__"];
  // type card = typeof q2["__cardinality__"];
  // type infer = computeObjectShape<
  //   el["__pointers__"],
  //   el["__shape__"],
  //   el["__polys__"]
  // >;
  // type q2 = setToTsType<typeof q2>;
  // // type adsf = typeof q2["__element__"]["__shape__"];
  // // const arg = q2.__element__.__shape__;
  // // type arg = typeof arg;
  // // type farg = flattenShape<arg>;
  const q3 = e.select(e.Hero, {
    id: true,
    q: q2,
  });
  type q3 = setToTsType<typeof q3>;
  const q4 = e.select(e.Hero, {
    id: true,
    q: q3,
  });
  type q4 = setToTsType<typeof q4>;
  const q5 = e.select(e.Hero, {
    id: true,
    q: q4,
  });
  type q5 = setToTsType<typeof q5>;
  // const q6 = e.select(e.Hero, {
  //   id: true,
  //   q: q5,
  // });
  // type q6 = setToTsType<typeof q6>;
  // const q7 = e.select(e.Hero, {
  //   id: true,
  //   q: q6,
  // });
  // type q7 = setToTsType<typeof q7>;
  // const q8 = e.select(e.Hero, {
  //   id: true,
  //   q: q7,
  // });
  // type q8 = setToTsType<typeof q8>;
  // const q9 = e.select(e.Hero, {
  //   id: true,
  //   q: q8,
  // });
  // type q9 = setToTsType<typeof q9>;
  // const q10 = e.select(e.Hero, {
  //   id: true,
  //   q: q9,
  // });
  // type q10 = setToTsType<typeof q10>;
  // const q11 = e.select(e.Hero, {
  //   id: true,
  //   q: q10,
  // });
  // type q11 = setToTsType<typeof q11>;
  // const q12 = e.select(e.Hero, {
  //   id: true,
  //   q: q11,
  // });
  // type q12 = setToTsType<typeof q12>;
  // const q13 = e.select(e.Hero, {
  //   id: true,
  //   q: q12,
  // });
  // type q13 = setToTsType<typeof q13>;
}

run();
export {};

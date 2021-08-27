// tslint:disable:no-console
import e from "./generated/example";
import {setupTests, teardownTests} from "./test/setupTeardown";

async function run() {
  await teardownTests();
  const data = await setupTests();

  //   SELECT Type {
  //   [IS InheritingObject].bases: {
  //     id
  //   } ORDER BY @index ASC,
  // }

  // e.select(
  //   e.schema.Type,
  //   {
  //     bases: e
  //       .select(e.schema.Type.$is(e.schema.InheritingObject), {
  //         id: true,
  //       })
  //       .orderBy(e.schema.Type.$is(e.schema.InheritingObject).),
  //   },
  //   e.is(e.schema.InheritingObject, {
  //     bases: {
  //       id: true,
  //     },
  //   })
  // );

  const theAvengers = e
    .select(e.Movie)
    .filter(e.eq(e.Movie.title, e.str("The Avengers")))
    .limit(1);
  const q = theAvengers.update({
    characters: {
      "+=": e
        .select(e.Villain)
        .filter(e.eq(e.Villain.name, e.str(data.thanos.name))),
    },
  });

  console.log(q.toEdgeQL());

  const q2 = e.insert(e.Villain, {
    name: e.str("Loki"),
    nemesis: e.insert(e.Hero, {
      name: e.str("Thor"),
      secret_identity: e.str("Thor"),
    }),
  });
  console.log(q2.toEdgeQL());
}
run();
export {};

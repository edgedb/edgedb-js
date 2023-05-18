import assert from "node:assert/strict";
import e from "../dbschema/edgeql-js";

test("simple for loop", () => {
  assert.equal(
    e.for(e.set(1, 2, 3), (x) => e.op(e.op(x, "*", 2), "+", x)).toEdgeQL(),
    `FOR __forVar__0 IN {{ 1, 2, 3 }}
  UNION (
    ((__forVar__0 * 2) + __forVar__0)
  )`
  );
});

test("with vars in for loop", () => {
  const q1 = e.for(e.set(1, 2, 3), (i) => {
    const str = e.to_str(i);
    return e.select({
      a: e.select(str),
      b: e.select(e.tuple([str, str])),
    });
  });

  assert.equal(q1.toEdgeQL(), `FOR __forVar__0 IN {{ 1, 2, 3 }}
UNION (
  (WITH
    __withVar_0 := std::to_str(__forVar__0)
  SELECT {
    single a := (SELECT __withVar_0),
    single b := (
      SELECT (
        __withVar_0,
        __withVar_0
      )
    )
  })
)`);

  const q2 = e.for(e.set(1, 2, 3), (i) => {
    const str = e.to_str(i);
    return e
      .insert(e.Hero, {
        name: str,
        secret_identity: str,
      })
      .unlessConflict((person) => ({
        on: person.name,
        else: e.update(person, () => ({
          set: {
            name: str,
          },
        })),
      }));
  });

  assert.equal(q2.toEdgeQL(), `FOR __forVar__0 IN {{ 1, 2, 3 }}
UNION (
  (WITH
    __withVar_1 := std::to_str(__forVar__0)
  INSERT default::Hero {
    name := __withVar_1,
    secret_identity := __withVar_1
  }
  UNLESS CONFLICT ON default::Hero.name
  ELSE ((WITH
    __scope_0_defaultHero := default::Hero
  UPDATE __scope_0_defaultHero SET {
    name := __withVar_1
  })))
)`);
});

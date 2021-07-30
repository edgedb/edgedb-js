// import * as edgedb from "edgedb";
import {computeObjectShape, simpleShapeToTs, typeutil} from "reflection";
import * as e from "../generated/example";

test("basic select", () => {
  const result = e.select(e.str("asdf" as string));
  type result = typeof result["__element__"]["__tstype__"];
  const f1: typeutil.assertEqual<result, string> = true;
});

test("basic shape", () => {
  const result = e.select(e.Hero);
  type result = typeof result["__element__"]["__tstype__"];
  const f1: typeutil.assertEqual<result, {id: string}> = true;
});

const q1 = e.select(e.Hero, {
  id: true,
  secret_identity: true,
  name: 1 > 0,
  villains: {
    id: true,
    computed: e.str("test"),
  },
  computed: e.str("test"),
});

test("complex shape", () => {
  type q1type = typeof q1["__element__"]["__tstype__"];
  const f1: typeutil.assertEqual<
    q1type,
    {
      id: string;
      name: string | undefined;
      secret_identity: string | null;
      villains: {
        id: string;
        computed: "test";
      };
      computed: "test";
    }
  > = true;
});

test("composability", () => {
  const nested = e.select(q1, {
    id: true,
    secret_identity: true,
    name: 1 > 0,
  });
  type nested = typeof nested["__element__"]["__tstype__"];
  const f1: typeutil.assertEqual<
    nested,
    {
      id: string;
      secret_identity: string | null;
      name: string | undefined;
    }
  > = true;
});

test("polymorphism", () => {
  const query = e.select(
    e.Person,
    {
      id: true,
      name: true,
    },
    e.is(e.Hero, {secret_identity: true}),
    e.is(e.Villain, {
      nemesis: {name: true},
    })
  );

  type poly = typeof query["__polys__"][0];
  const f1: typeutil.assertEqual<
    poly["params"],
    {secret_identity: true}
  > = true;

  type result = typeof query["__element__"]["__tstype__"];
  const f2: typeutil.assertEqual<
    result,
    {
      id: string;
      name: string;
      nemesis?:
        | {
            name: string;
          }
        | undefined;
      secret_identity?: string | null | undefined;
    }
  > = true;
});

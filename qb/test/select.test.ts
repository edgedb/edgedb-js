// import * as edgedb from "edgedb";
import {ExpressionKind, TypeKind, typeutil} from "edgedb/src/reflection";
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
  expect(result.__element__.__params__).toEqual({id: true});
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

test("compositionality", () => {
  // selecting a select statement should
  // default to { id }
  const no_params = e.select(q1);
  type no_params = typeof no_params["__element__"]["__tstype__"];
  const no_params_test: typeutil.assertEqual<
    no_params,
    {
      id: string;
    }
  > = true;
  expect(no_params.__element__.__params__).toEqual({id: true});
  expect(no_params.__element__.__polys__).toEqual([]);

  // allow override params
  const override_params = e.select(q1, {
    id: true,
    secret_identity: true,
  });
  type override_params = typeof override_params["__element__"]["__tstype__"];
  const f1: typeutil.assertEqual<
    override_params,
    {
      id: string;
      secret_identity: string | null;
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

  expect(query.__kind__).toEqual(ExpressionKind.ShapeSelect);
  expect(query.__element__.__kind__).toEqual(TypeKind.object);
  expect(query.__element__.__name__).toEqual("default::Person_shape");
  expect(query.__element__.__params__).toEqual({id: true, name: true});
  expect(query.__element__.__polys__[0].params).toEqual({
    secret_identity: true,
  });
  expect(query.__element__.__polys__[0].type.__name__).toEqual(
    "default::Hero"
  );
  expect(query.__element__.__polys__[1].params).toEqual({
    nemesis: {name: true},
  });
  expect(query.__element__.__polys__[1].type.__name__).toEqual(
    "default::Villain"
  );

  type poly = typeof query["__element__"]["__polys__"][0];
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

test("shape type name", () => {
  const name = e.select(e.Hero).__element__.__name__;
  const f1: typeutil.assertEqual<typeof name, "default::Hero_shape"> = true;
});

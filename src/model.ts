/*!
 * This source file is part of the EdgeDB open source project.
 *
 * Copyright 2020-present MagicStack Inc. and the EdgeDB authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

type OptionalKeys<T extends object> = {
  [k in keyof T]: undefined extends T[k] ? k : never;
}[keyof T];

type RequiredKeys<T extends object> = Exclude<keyof T, OptionalKeys<T>>;

type AddQuestionMarks<T extends object> = {
  [k in OptionalKeys<T>]?: T[k];
} &
  {[k in RequiredKeys<T>]: T[k]};

type AllOptional<T extends object> = {
  [k in keyof T]?: T[k];
};

type ObjectIntersection<T extends EdgeRawShape> = AddQuestionMarks<
  {
    [k in keyof T]: T[k]["_type"];
  }
>;

type Identity<T> = T;
type FlattenObject<T extends EdgeRawShape> = Identity<{[k in keyof T]: T[k]}>;

export type ObjectType<T extends EdgeRawShape> = FlattenObject<
  ObjectIntersection<T>
>;

////////

type Infer<T extends {_type: any}> = T["_type"];

enum EdgeTypeKind {
  scalar,
  object,
}

interface EdgeTypeParams {
  kind: EdgeTypeKind;
  name: string;
}

interface EdgeObjTypeParams extends EdgeTypeParams {
  shape: EdgeRawShape;
}

type EdgeAnyType = EdgeTypeDef<any, any>;
type EdgeRawShape = {[k: string]: EdgeAnyType};

abstract class EdgeTypeDef<T, P extends EdgeTypeParams = EdgeTypeParams> {
  readonly _type!: T;
  readonly _params!: P;

  constructor(params: P) {
    this._params = params;
  }
}

class EdgeStr extends EdgeTypeDef<string> {
  static create(): EdgeStr {
    return new EdgeStr({
      kind: EdgeTypeKind.scalar,
      name: "std::str",
    });
  }
}

class EdgeInt64 extends EdgeTypeDef<number> {
  static create(): EdgeInt64 {
    return new EdgeInt64({
      kind: EdgeTypeKind.scalar,
      name: "std::int64",
    });
  }
}

type Params<T> = {
  [k in keyof T]?: boolean;
};

type Res<T, P extends keyof T> = {
  [k in P]: T[k];
};

class EdgeType<
  T extends EdgeRawShape,
  Type extends ObjectType<T> = ObjectType<T>
> extends EdgeTypeDef<Type, EdgeObjTypeParams> {
  readonly _shape!: T;

  static create = <T extends EdgeRawShape>(shape: () => T): EdgeType<T> => {
    return new EdgeType({
      kind: EdgeTypeKind.object,
      name: "std::str",
      shape: shape(),
    });
  };

  // prettier-ignore
  select = <
    PP extends {[k in keyof P]: boolean},
    PPP extends AllOptional<PP>,
    P = Params<Type>
  >
  (
    shape: PPP
  ): {[k in keyof PPP & keyof Type]: Type[k]} => {
    return 1 as any;
  };
}

export const std = {
  str: EdgeStr.create,
  int64: EdgeInt64.create,
};

export const type = EdgeType.create;

const t0 = type(() => {
  return {
    spam: std.str(),
  };
});

function ref<T>(f: () => T): T {
  return f();
}

const User = type(() => {
  return {
    name: std.str(),
    email: std.str(),
    age: std.int64(),
  };
});

const z2 = User.select({
  name: true,
  age: false,
  zzzz: 1,
});

type ZZZ = {
  a?: number;
};

function ppp(p: ZZZ): never {
  return 1 / 0;
}

ppp({a: 1, b: 2});

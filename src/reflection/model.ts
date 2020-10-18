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

export enum Cardinality {
  AtMostOne,
  One,
  Many,
  AtLeastOne,
}

// `PropertyDesc` and `LinkDesc` are used in `__types__/*` files
// that directly reflect EdgeDB types to TypeScript types.
//
// These types must have different internal structure, so that's
// why they have `propertyTarget` and `linkTarget` attributes
// (not just `target`.)  Otherwise TS would fail to tell one from
// another in a conditional check like `A extends PropertyDesc`.
export interface PropertyDesc<T, C extends Cardinality> {
  cardinality: C;
  propertyTarget: T;
}
export interface LinkDesc<T, C extends Cardinality> {
  cardinality: C;
  linkTarget: T;
}

// `PropertyRef` and `LinkRef` are used in `schema/*` files
// that implement concrete JS objects for users to use with
// the query builder.
//
// `Property` and `Link` are empty interfaces made so that TS
// doesn't expand them in the autocomplete.
const PointerType = Symbol.for("pointer-type");
const LinkTargetAttr = Symbol.for("link-target");
export const links = Symbol.for("object-type-links");
export enum PointerKind {
  link,
  property,
}
interface Property {}
interface Link {}
export interface PropertyRef<T extends PropertyDesc<any, any>>
  extends Property {
  kind: PointerKind.property;
  name: string;
  cardinality: Cardinality;
}
export interface LinkRef<T extends LinkDesc<any, any>> extends Link {
  kind: PointerKind.link;
  name: string;
  cardinality: Cardinality;
}

type LL<T extends object> = {
  [K in keyof T]: T[K];
};

export interface ObjectType {
  [links]: string;
}

export interface Object1 {
  [links]: [...string[]];
}

type Unpack<T extends ObjectType> = {
  [k in keyof T & T[typeof links]]: T[k] extends LinkDesc<infer LT, any>
    ? LT extends ObjectType
      ? Unpack<LT>
      : never
    : T[k] extends PropertyDesc<infer PT, any>
    ? PT extends ObjectType
      ? Unpack<PT>
      : never
    : never;
};

export function Path<T extends ObjectType>(
  parent: Object1 | null,
  target: () => object
): Unpack<T> {
  const t = target() as Object1;
  const ret = {parent};

  for (const link of t[links]) {
    Object.defineProperty(ret, link, {
      get: (l: string = link): any => {
        return Path(t, () => (t as any)[l]);
      },
    });
  }

  return ret as any;
}

type UnpackBoolArg<Arg, T> = Arg extends true
  ? T
  : Arg extends false
  ? undefined
  : Arg extends boolean
  ? T | undefined
  : Arg extends PropertyDesc<infer PPT, any>
  ? PPT extends Date
    ? Date
    : PPT
  : T extends Date
  ? Date
  : T;

type ExcludeTFromArgs<Args, T> = {
  [k in keyof Args]: k extends keyof T ? never : k;
}[keyof Args];

type BaseResult<Args, T> = {
  [k in (keyof T & keyof Args) | ExcludeTFromArgs<Args, T>]: k extends keyof T
    ? T[k] extends PropertyDesc<
        infer PPT,
        Cardinality.Many | Cardinality.AtLeastOne
      >
      ? Array<UnpackBoolArg<Args[k], PPT>>
      : T[k] extends PropertyDesc<infer PPT1, Cardinality.One>
      ? UnpackBoolArg<Args[k], PPT1>
      : T[k] extends PropertyDesc<infer PPT2, Cardinality.AtMostOne>
      ? UnpackBoolArg<Args[k], PPT2> | void
      : T[k] extends LinkDesc<
          infer LLT,
          Cardinality.Many | Cardinality.AtLeastOne
        >
      ? Array<BaseResult<Args[k], LLT>>
      : T[k] extends LinkDesc<infer LLT1, Cardinality.One>
      ? BaseResult<Args[k], LLT1>
      : T[k] extends LinkDesc<infer LLT2, Cardinality.AtMostOne>
      ? BaseResult<Args[k], LLT2> | void
      : unknown // : Args[k] extends Computable<infer CT> // ? CT
    : never;
};

type ExpandResult<T> = T extends
  | BaseResult<any, any>
  | Array<BaseResult<any, any>>
  ? T extends infer O
    ? {[K in keyof O]: ExpandResult<O[K]>}
    : never
  : T;

export type Result<Args, T> = ExpandResult<BaseResult<Args, T>>;

export type MakeSelectArgs<T> = {
  [k in keyof T]?: T[k] extends LinkDesc<infer LT, any>
    ? MakeSelectArgs<LT> | boolean
    : T[k] extends PropertyDesc<any, any>
    ? boolean
    : never;
};

export class Query<T> {
  _type!: T;

  filter(): Query<T> {
    return null as any;
  }
}

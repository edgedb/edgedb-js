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
export interface ObjectTypeDesc {
  id: PropertyDesc<string, Cardinality.One>;
}

export type UnpackBoolArg<Arg, T> = Arg extends true
  ? T
  : Arg extends false
  ? null
  : Arg extends boolean
  ? T | null
  : never;

export type ExcludeTFromArgs<Args, T> = {
  [k in keyof Args]: k extends keyof T ? never : k;
}[keyof Args];

export type BaseResult<Args, T> = {
  [k in (keyof T & keyof Args) | ExcludeTFromArgs<Args, T>]: k extends keyof T
    ? T[k] extends PropertyDesc<
        infer PPT,
        Cardinality.Many | Cardinality.AtLeastOne
      >
      ? Array<UnpackBoolArg<Args[k], PPT>>
      : T[k] extends PropertyDesc<infer PPT1, Cardinality.One>
      ? UnpackBoolArg<Args[k], PPT1>
      : T[k] extends PropertyDesc<infer PPT2, Cardinality.AtMostOne>
      ? UnpackBoolArg<Args[k], PPT2> | null
      : T[k] extends LinkDesc<
          infer LLT,
          Cardinality.Many | Cardinality.AtLeastOne
        >
      ? Array<BaseResult<Args[k], LLT>>
      : T[k] extends LinkDesc<infer LLT1, Cardinality.One>
      ? BaseResult<Args[k], LLT1>
      : T[k] extends LinkDesc<infer LLT2, Cardinality.AtMostOne>
      ? BaseResult<Args[k], LLT2> | null
      : unknown // : Args[k] extends Computable<infer CT> // ? CT
    : never;
};

export type ExpandResult<T> = T extends
  | BaseResult<any, any>
  | Array<BaseResult<any, any>>
  ? T extends infer O
    ? {[K in keyof O]: ExpandResult<O[K]>}
    : never
  : T;

export type Result<Args, T extends ObjectTypeDesc> = ExpandResult<
  BaseResult<Args, T>
>;

export type BaseMakeSelectArgs<T> = {
  [k in keyof T]?: T[k] extends LinkDesc<infer LT, any>
    ? BaseMakeSelectArgs<LT> | boolean
    : T[k] extends PropertyDesc<any, any>
    ? boolean
    : never;
};

export type MakeSelectArgs<T extends ObjectTypeDesc> = BaseMakeSelectArgs<T>;

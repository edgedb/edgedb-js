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

import {AnyMaterialtype, Materialtype, TSTYPE} from "./typesystem";

export enum Cardinality {
  AtMostOne = "AtMostOne",
  One = "One",
  Many = "Many",
  AtLeastOne = "AtLeastOne",
  Empty = "Empty",
}

// `PropertyDesc` and `LinkDesc` are used in `__types__/*` files
// that directly reflect EdgeDB types to TypeScript types.
//
// These types must have different internal structure, so that's
// why they have `propertyTarget` and `linkTarget` attributes
// (not just `target`.)  Otherwise TS would fail to tell one from
// another in a conditional check like `A extends PropertyDesc`.
export interface PropertyDesc<
  T extends AnyMaterialtype,
  C extends Cardinality
> {
  cardinality: C;
  propertyTarget: T;
}

export interface LinkDesc<
  T extends ObjectType<any, any>,
  C extends Cardinality
> {
  cardinality: C;
  linkTarget: T;
}

export type ObjectTypeShape = {
  [k: string]: PropertyDesc<any, any> | LinkDesc<any, any>;
};

export type typeAndCardToTsType<
  Type extends AnyMaterialtype,
  Card extends Cardinality
> = Card extends Cardinality.Empty
  ? null
  : Card extends Cardinality.One
  ? Type["__tstype__"]
  : Card extends Cardinality.AtLeastOne
  ? Type["__tstype__"][]
  : Card extends Cardinality.AtMostOne
  ? Type["__tstype__"] | null
  : Card extends Cardinality.Many
  ? Type["__tstype__"][]
  : never;

export type PropertyDescToTsType<
  Prop extends PropertyDesc<any, any>
> = Prop extends PropertyDesc<infer Type, infer Card>
  ? typeAndCardToTsType<Type, Card>
  : never;

export type LinkDescToTsType<
  Link extends LinkDesc<any, any>
> = Link extends LinkDesc<infer Type, infer Card>
  ? typeAndCardToTsType<Type, Card>
  : never;

export type ObjectTypeShapeToTsType<T extends ObjectTypeShape> = {
  [k in keyof T]: T[k] extends PropertyDesc<any, any>
    ? PropertyDescToTsType<T[k]>
    : T[k] extends LinkDesc<any, any>
    ? LinkDescToTsType<T[k]>
    : any;
};

export interface ObjectType<Name extends string, Shape extends ObjectTypeShape>
  extends Materialtype<Name, ObjectTypeShapeToTsType<Shape>> {
  __shape__: Shape;
}

export type AnyObject = ObjectType<string, ObjectTypeShape>;

// export interface BaseObject
//   extends ObjectType<
//     "std::BaseObject",
//     {id: PropertyDesc<Str, Cardinality.One>}
//   > {
//   // id: PropertyDesc<string, Cardinality.One>;
// }

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

// export const OBJECT_SYMBOL: unique symbol = Symbol();
// export interface AnyObject {
//   [OBJECT_SYMBOL]: true
// }

export type ExpandResult<T> = T extends
  | BaseResult<any, any>
  | Array<BaseResult<any, any>>
  ? T extends infer O
    ? {[K in keyof O]: ExpandResult<O[K]>}
    : never
  : T;

export type Result<Args, T extends AnyObject> = ExpandResult<
  BaseResult<Args, T>
>;

export type BaseMakeSelectArgs<T extends AnyObject> = {
  [k in keyof T["__shape__"]]?: T["__shape__"][k] extends LinkDesc<
    infer LT,
    any
  >
    ? BaseMakeSelectArgs<LT> | boolean
    : T["__shape__"][k] extends PropertyDesc<any, any>
    ? boolean
    : never;
};

export type MakeSelectArgs<T extends AnyObject> = BaseMakeSelectArgs<T>;

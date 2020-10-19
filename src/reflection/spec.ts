import {Link} from "../m3";
import {StrictMap} from "./strict";
import * as model from "./model";

type TypeName = string;

type PropertySpec = {
  name: TypeName;
  cardinality: model.Cardinality;
};

type LinkSpec = {
  name: TypeName;
  cardinality: model.Cardinality;
  target: TypeName;
  properties: PropertySpec[];
};

type TypeSpec = {
  name: TypeName;
  bases: TypeName[];
  properties: PropertySpec[];
  links: LinkSpec[];
};

export type TypesSpec = StrictMap<string, TypeSpec>;

type ObjectType<T extends model.ObjectTypeDesc> = {
  [k in keyof T]: T[k] extends model.LinkDesc<infer LT, any>
    ? LT extends model.ObjectTypeDesc
      ? ObjectType<LT>
      : never
    : T[k] extends model.PropertyDesc<infer PT, any>
    ? PT
    : never;
} & {
  shape<S extends model.MakeSelectArgs<T>>(
    spec: S
  ): model.Query<model.Result<S, T>>;
};

export function objectType<T extends model.ObjectTypeDesc>(
  spec: TypesSpec,
  name: string
): ObjectType<T> {
  return null as any;
}

// // `PropertyRef` and `LinkRef` are used in `schema/*` files
// // that implement concrete JS objects for users to use with
// // the query builder.
// //
// // `Property` and `Link` are empty interfaces made so that TS
// // doesn't expand them in the autocomplete.
// const PointerType = Symbol.for("pointer-type");
// const LinkTargetAttr = Symbol.for("link-target");
// export const links = Symbol.for("object-type-links");
// export enum PointerKind {
//   link,
//   property,
// }
// interface Property {}
// interface Link {}
// export interface PropertyRef<T extends PropertyDesc<any, any>>
//   extends Property {
//   kind: PointerKind.property;
//   name: string;
//   cardinality: Cardinality;
// }
// export interface LinkRef<T extends LinkDesc<any, any>> extends Link {
//   kind: PointerKind.link;
//   name: string;
//   cardinality: Cardinality;
// }

// type LL<T extends object> = {
//   [K in keyof T]: T[K];
// };

// export interface ObjectType {
//   [links]: string;
// }

// export interface Object1 {
//   [links]: [...string[]];
// }

// type Unpack<T extends ObjectType> = {
//   [k in keyof T]: T[k] extends LinkDesc<infer LT, any>
//     ? LT extends ObjectType
//       ? Unpack<LT>
//       : never
//     : T[k] extends PropertyDesc<infer PT, any>
//     ? PT extends ObjectType
//       ? Unpack<PT>
//       : never
//     : never;
// };

// export function Path<T extends ObjectType>(
//   parent: Object1 | null,
//   target: () => object
// ): Unpack<T> {
//   const t = target() as Object1;
//   const ret = {parent};

//   for (const link of t[links]) {
//     Object.defineProperty(ret, link, {
//       get: (l: string = link): any => {
//         return Path(t, () => (t as any)[l]);
//       },
//     });
//   }

//   return ret as any;
// }

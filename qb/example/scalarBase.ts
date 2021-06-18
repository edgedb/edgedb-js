export type AnyAnytype = Anytype<any, any, any>;
export type AnyMaterialtype = Materialtype<unknown, string, any, any, any>;
export type AnytypeTuple = [AnyAnytype, ...AnyAnytype[]] | [];

const ANYTYPE: unique symbol = Symbol("anytype");
type ANYTYPE = typeof ANYTYPE;
const MATERIAL_TYPE: unique symbol = Symbol("material_type");
type MATERIAL_TYPE = typeof MATERIAL_TYPE;
const TSTYPE: unique symbol = Symbol("tstype");
type TSTYPE = typeof TSTYPE;
const CASTABLE: unique symbol = Symbol("castable");
type CASTABLE = typeof CASTABLE;
const ASSIGNABLE: unique symbol = Symbol("assignable");
type ASSIGNABLE = typeof ASSIGNABLE;
const IMPLICITCAST: unique symbol = Symbol("implicitly_castable");
type IMPLICITCAST = typeof IMPLICITCAST;

export interface Anytype<
  CastableTo extends AnyAnytype,
  AssignableTo extends AnyAnytype,
  ImplicitlyCastableTo extends AnyAnytype
  // CastableTo extends AnytypeTuple,
  // AssignableTo extends AnytypeTuple,
  // ImplicitlyCastableTo extends AnytypeTuple
> {
  [ANYTYPE]: true;
  [CASTABLE]: CastableTo;
  [ASSIGNABLE]: AssignableTo;
  [IMPLICITCAST]: ImplicitlyCastableTo;
  __name: string;
}

export interface Materialtype<
  TsType,
  Name extends string,
  CastableTo extends AnyAnytype,
  AssignableTo extends AnyAnytype,
  ImplicitlyCastableTo extends AnyAnytype
> extends Anytype<CastableTo, AssignableTo, ImplicitlyCastableTo> {
  [MATERIAL_TYPE]: true;
  [TSTYPE]: TsType;
  __name: Name;
}

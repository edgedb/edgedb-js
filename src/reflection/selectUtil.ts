import {AnyObject, Cardinality, LinkDesc, PropertyDesc} from "./typesystem";

export namespace selectUtil {
  ///////////////
  /// Type inference helpers
  ////////////////
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
    [k in
      | (keyof T & keyof Args)
      | ExcludeTFromArgs<Args, T>]: k extends keyof T
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
}

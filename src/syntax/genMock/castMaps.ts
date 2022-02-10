export type scalarCastableFrom<T extends any> = any;
export type scalarAssignableBy<T extends any> = any;
export type orScalarLiteral<T extends any> = any;
export type scalarLiterals = any;
export type literalToScalarType<T extends any> = any;
type literalToTypeSet<T extends any> = any;
export type mapLiteralToTypeSet<T> = {
  [k in keyof T]: literalToTypeSet<T[k]>;
};
declare function literalToTypeSet(t: any): any;
export {literalToTypeSet};
export declare function isImplicitlyCastableTo(
  from: string,
  to: string
): boolean;

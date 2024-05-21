/* eslint-disable */

export type scalarCastableFrom<_T> = any;
export type scalarAssignableBy<_T> = any;
export type orScalarLiteral<_T> = any;
export type scalarLiterals = any;
export type literalToScalarType<_T> = any;
type literalToTypeSet<_T> = any;
export type mapLiteralToTypeSet<T> = {
  [k in keyof T]: literalToTypeSet<T[k]>;
};
declare function literalToTypeSet(t: any): any;
export { literalToTypeSet };
export declare function isImplicitlyCastableTo(
  from: string,
  to: string
): boolean;
export function getSharedParentScalar(_a: any, _b: any): any {}
export type getSharedParentScalar<_A, _B> = any;

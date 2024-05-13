export type scalarCastableFrom = any;
export type scalarAssignableBy = any;
export type orScalarLiteral = any;
export type scalarLiterals = any;
export type literalToScalarType = any;
type literalToTypeSet = any;
export type mapLiteralToTypeSet<T> = {
  [k in keyof T]: literalToTypeSet<T[k]>;
};
declare function literalToTypeSet(t: any): any;
export { literalToTypeSet };
export declare function isImplicitlyCastableTo(
  from: string,
  to: string
): boolean;
export function getSharedParentScalar(a: any, b: any): any {}
export type getSharedParentScalar<A, B> = any;

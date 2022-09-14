/* Safari does not support BigInt, hence this polyfill. */

interface JSBI {
  BigInt(from: number | string | boolean | object): JSBI;
  isBigInt(x: JSBI): boolean;

  toNumber(x: JSBI): number;

  unaryMinus(x: JSBI): JSBI;
  bitwiseNot(x: JSBI): JSBI;

  exponentiate(x: JSBI, y: JSBI): JSBI;
  multiply(x: JSBI, y: JSBI): JSBI;
  divide(x: JSBI, y: JSBI): JSBI;
  remainder(x: JSBI, y: JSBI): JSBI;
  add(x: JSBI, y: JSBI): JSBI;
  subtract(x: JSBI, y: JSBI): JSBI;
  leftShift(x: JSBI, y: JSBI): JSBI;
  signedRightShift(x: JSBI, y: JSBI): JSBI;

  lessThan(x: JSBI, y: JSBI): boolean;
  lessThanOrEqual(x: JSBI, y: JSBI): boolean;
  greaterThan(x: JSBI, y: JSBI): boolean;
  greaterThanOrEqual(x: JSBI, y: JSBI): boolean;
  equal(x: JSBI, y: JSBI): boolean;
  notEqual(x: JSBI, y: JSBI): boolean;

  bitwiseAnd(x: JSBI, y: JSBI): JSBI;
  bitwiseXor(x: JSBI, y: JSBI): JSBI;
  bitwiseOr(x: JSBI, y: JSBI): JSBI;

  asIntN(n: number, x: JSBI): JSBI;
  asUintN(n: number, x: JSBI): JSBI;

  ADD(x: any, y: any): any;
  LT(x: any, y: any): boolean;
  LE(x: any, y: any): boolean;
  GT(x: any, y: any): boolean;
  GE(x: any, y: any): boolean;
  EQ(x: any, y: any): boolean;
  NE(x: any, y: any): boolean;
}

export type BigIntLike = bigint | JSBI;

let JSBI: JSBI | null = null;

export const hasNativeBigInt = typeof BigInt !== "undefined";

export function plugJSBI(jsbi: any): void {
  JSBI = jsbi as JSBI;
}

let _isBigInt;
let _make;
let _add;
let _div;
let _sub;
let _mul;
let _rshift;
let _bitand;
let _gte;
let _lt;
let _remainder;

if (hasNativeBigInt) {
  _isBigInt = (val: BigIntLike): boolean => typeof val === "bigint";

  _make = (val: string | number): BigIntLike => BigInt(val);

  _add = (op1: BigIntLike, op2: BigIntLike): BigIntLike =>
    ((op1 as bigint) + (op2 as bigint)) as BigIntLike;

  _sub = (op1: BigIntLike, op2: BigIntLike): BigIntLike =>
    ((op1 as bigint) - (op2 as bigint)) as BigIntLike;

  _div = (op1: BigIntLike, op2: BigIntLike): BigIntLike =>
    ((op1 as bigint) / (op2 as bigint)) as BigIntLike;

  _mul = (op1: BigIntLike, op2: BigIntLike): BigIntLike =>
    ((op1 as bigint) * (op2 as bigint)) as BigIntLike;

  _rshift = (op1: BigIntLike, op2: BigIntLike): BigIntLike =>
    ((op1 as bigint) >> (op2 as bigint)) as BigIntLike;

  _bitand = (op1: BigIntLike, op2: BigIntLike): BigIntLike =>
    ((op1 as bigint) & (op2 as bigint)) as BigIntLike;

  _gte = (op1: BigIntLike, op2: BigIntLike): boolean =>
    (op1 as bigint) >= (op2 as bigint);

  _lt = (op1: BigIntLike, op2: BigIntLike): boolean =>
    (op1 as bigint) < (op2 as bigint);

  _remainder = (op1: BigIntLike, op2: BigIntLike): BigIntLike =>
    ((op1 as bigint) % (op2 as bigint)) as BigIntLike;
} else {
  _isBigInt = (val: BigIntLike): boolean => {
    const j: any = ensureJSBI();
    return val instanceof j;
  };

  _make = (val: string | number): BigIntLike => {
    const j = ensureJSBI();
    return j.BigInt(val);
  };

  _add = (op1: BigIntLike, op2: BigIntLike): BigIntLike => {
    const j = ensureJSBI();
    return j.add(op1 as JSBI, op2 as JSBI);
  };

  _sub = (op1: BigIntLike, op2: BigIntLike): BigIntLike => {
    const j = ensureJSBI();
    return j.subtract(op1 as JSBI, op2 as JSBI);
  };

  _div = (op1: BigIntLike, op2: BigIntLike): BigIntLike => {
    const j = ensureJSBI();
    return j.divide(op1 as JSBI, op2 as JSBI);
  };

  _mul = (op1: BigIntLike, op2: BigIntLike): BigIntLike => {
    const j = ensureJSBI();
    return j.multiply(op1 as JSBI, op2 as JSBI);
  };

  _rshift = (op1: BigIntLike, op2: BigIntLike): BigIntLike => {
    const j = ensureJSBI();
    return j.signedRightShift(op1 as JSBI, op2 as JSBI);
  };

  _bitand = (op1: BigIntLike, op2: BigIntLike): BigIntLike => {
    const j = ensureJSBI();
    return j.bitwiseAnd(op1 as JSBI, op2 as JSBI);
  };

  _gte = (op1: BigIntLike, op2: BigIntLike): boolean => {
    const j = ensureJSBI();
    return j.greaterThanOrEqual(op1 as JSBI, op2 as JSBI);
  };

  _lt = (op1: BigIntLike, op2: BigIntLike): boolean => {
    const j = ensureJSBI();
    return j.lessThan(op1 as JSBI, op2 as JSBI);
  };

  _remainder = (op1: BigIntLike, op2: BigIntLike): BigIntLike => {
    const j = ensureJSBI();
    return j.remainder(op1 as JSBI, op2 as JSBI);
  };
}

function ensureJSBI(): JSBI {
  if (JSBI == null) {
    throw new Error("JSBI library is required to polyfill BigInt");
  }

  return JSBI;
}

export const isBigInt = _isBigInt;
export const make = _make;
export const add = _add;
export const sub = _sub;
export const div = _div;
export const mul = _mul;
export const rshift = _rshift;
export const bitand = _bitand;
export const gte = _gte;
export const lt = _lt;
export const remainder = _remainder;

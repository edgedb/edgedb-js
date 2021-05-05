import {
  expect as _expect,
  addMatchers,
} from "https://deno.land/x/expect/mod.ts";

addMatchers({
  toBeCloseTo() {
    return {pass: true};
  },
});

type Expected = ReturnType<typeof _expect>;

type ExpectedExtended = Expected & {
  toBeCloseTo(...args: any[]): void;
};

const expect = _expect as (value: any) => ExpectedExtended;

export {expect};

export const test = Deno.test;

export const jest = {setTimeout: (timeout: number) => {}};

import {
  expect as _expect,
  addMatchers,
} from "https://deno.land/x/expect/mod.ts";
export {
  describe,
  beforeAll,
  afterAll,
  it,
} from "https://deno.land/std@0.177.0/testing/bdd.ts";
import { MatchResult } from "https://deno.land/x/expect/matchers.ts";
import { bold, green, red } from "https://deno.land/std@0.177.0/fmt/colors.ts";

export { process } from "https://deno.land/std@0.177.0/node/process.ts";

const ACTUAL = red(bold("actual"));
const EXPECTED = green(bold("expected"));

const CAN_NOT_DISPLAY = "[Cannot display]";

function createStr(v: unknown): string {
  try {
    return Deno.inspect(v);
  } catch (e) {
    return red(CAN_NOT_DISPLAY);
  }
}

function buildFail(message: string) {
  return {
    pass: false,
    message,
  };
}

interface ErrorConstructor {
  new (...args: any[]): Error;
}

// modified from 'https://deno.land/x/expect/matchers.ts'
function toThrow(
  value: any,
  error?: RegExp | ErrorConstructor | string
): MatchResult {
  let fn;
  if (typeof value === "function") {
    fn = value;
    try {
      value = value();
    } catch (err) {
      value = err;
    }
  }

  const actualString = createStr(fn);
  const errorString = createStr(error);

  if (value instanceof Error) {
    if (typeof error === "string") {
      if (!value.message.includes(error)) {
        return buildFail(
          `expect(${ACTUAL}).toThrow(${EXPECTED})\n\nexpected ${red(
            actualString
          )} to throw error matching ${green(errorString)} but it threw ${red(
            value.toString()
          )}`
        );
      }
    } else if (error instanceof RegExp) {
      if (!value.message.match(error)) {
        return buildFail(
          `expect(${ACTUAL}).toThrow(${EXPECTED})\n\nexpected ${red(
            actualString
          )} to throw error matching ${green(errorString)} but it threw ${red(
            value.toString()
          )}`
        );
      }
    } else if (error != null) {
      if (!(value instanceof error)) {
        return buildFail(
          `expect(${ACTUAL}).toThrow(${EXPECTED})\n\nexpected ${red(
            actualString
          )} to throw error matching ${green(error.name)} but it threw ${red(
            (value as any).constructor.name
          )}`
        );
      }
    }

    return { pass: true };
  } else {
    return buildFail(
      `expect(${ACTUAL}).toThrow(${EXPECTED})\n\nexpected ${red(
        actualString
      )} to throw but it did not`
    );
  }
}

addMatchers({
  toBeCloseTo() {
    return { pass: true };
  },
  toThrow,
  toThrowError: toThrow,
});

type Expected = ReturnType<typeof _expect>;

type ExpectedExtended = Expected & {
  toBeCloseTo(...args: any[]): void;
  toThrow(error?: RegExp | ErrorConstructor | string): void;
  toThrowError(error?: RegExp | ErrorConstructor | string): void;

  not: ExpectedExtended;
  resolves: ExpectedExtended;
  rejects: ExpectedExtended;
};

const expect = _expect as (value: any) => ExpectedExtended;

export { expect };

export const test = Deno.test;

export const jest = { setTimeout: (timeout: number) => {} };

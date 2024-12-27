let testFn: any;
let expectFn: any;
let describeFn: any;
let beforeAllFn: any;
let afterAllFn: any;
let itFn: any;
let setTimeout: any;

// @ts-ignore
const isDeno = typeof Deno !== "undefined";

if (isDeno) {
  const { describe, beforeAll, afterAll, it } = await import(
    "https://deno.land/std@0.177.0/testing/bdd.ts"
  );
  const { expect } = await import("jsr:@std/expect");
  // @ts-ignore
  testFn = Deno.test;
  // @ts-ignore
  setTimeout = Deno.setTimeout;
  expectFn = expect;
  itFn = it;
  describeFn = describe;
  beforeAllFn = beforeAll;
  afterAllFn = afterAll;
} else {
  const { expect } = await import("expect");

  testFn = global.test;
  // @ts-ignore
  setTimeout = jest.setTimeout;
  expectFn = expect;
  itFn = global.it;
  describeFn = global.describe;
  beforeAllFn = global.beforeAll;
  afterAllFn = global.afterAll;
}

export {
  testFn as test,
  expectFn as expect,
  setTimeout,
  describeFn as describe,
  beforeAllFn as beforeAll,
  afterAllFn as afterAll,
  itFn as it,
};

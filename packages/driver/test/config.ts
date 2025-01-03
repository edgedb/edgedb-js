// @ts-ignore
const isDeno = typeof Deno !== "undefined";

const setupDenoEnvironment = new Function(`
  return (async function() {
      const { describe, beforeAll, afterAll, it } = await import(
        "https://deno.land/std@0.177.0/testing/bdd.ts"
      );
      const { expect } = await import("jsr:@std/expect");

      globalThis.testFn = Deno.test;
      globalThis.setTimeout = Deno.setTimeout;
      globalThis.expectFn = expect;
      globalThis.itFn = it;
      globalThis.describeFn = describe;
      globalThis.beforeAllFn = beforeAll;
      globalThis.afterAllFn = afterAll;
  })();
`);

export async function setupTestEnv() {
  if (isDeno) {
    await setupDenoEnvironment();

    return {
      test: (globalThis as any).testFn,
      expect: (globalThis as any).expectFn,
      setTimeout: (globalThis as any).setTimeout,
      describe: (globalThis as any).describeFn,
      beforeAll: (globalThis as any).beforeAllFn,
      it: (globalThis as any).itFn,
    };
  } else {
    const { expect } = require("expect");

    (globalThis as any).testFn = global.test;
    // @ts-ignore
    (globalThis as any).setTimeout = jest.setTimeout;
    (globalThis as any).expectFn = expect;
    (globalThis as any).itFn = global.it;
    (globalThis as any).describeFn = global.describe;
    (globalThis as any).beforeAllFn = global.beforeAll;
    (globalThis as any).afterAllFn = global.afterAll;

    return {
      test: (globalThis as any).testFn,
      expect: (globalThis as any).expectFn,
      setTimeout: (globalThis as any).setTimeout,
      describe: (globalThis as any).describeFn,
      beforeAll: (globalThis as any).beforeAllFn,
      it: (globalThis as any).itFn,
    };
  }
}

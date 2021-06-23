export namespace util {
  export const deduplicate = (args: string[]) => [...new Set(args)];

  export const getFromArrayMap = <T>(map: Record<string, T[]>, id: string) => {
    return map[id] || [];
  };
}

export namespace typeutil {
  export type assertEqual<T, Expected> = [T] extends [Expected]
    ? [Expected] extends [T]
      ? true
      : false
    : false;

  export type depromisify<T> = T extends Promise<infer U> ? depromisify<U> : T;
  export type identity<T> = T;
  export type flatten<T> = identity<{[k in keyof T]: T[k]}>;
}

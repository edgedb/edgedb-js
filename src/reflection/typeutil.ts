export namespace typeutil {
  export type assertEqual<T, Expected> = [T] extends [Expected]
    ? [Expected] extends [T]
      ? true
      : false
    : false;
}

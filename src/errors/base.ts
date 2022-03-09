export class EdgeDBError extends Error {
  source?: Error;
  protected static tags: object = {};

  get name(): string {
    return this.constructor.name;
  }

  hasTag(tag: symbol): boolean {
    // Can't index by symbol, except when using <any>:
    //   https://github.com/microsoft/TypeScript/issues/1863
    const error_type = <any>(<typeof EdgeDBError>this.constructor);
    return Boolean(error_type.tags?.[tag]);
  }
}

export type ErrorType = new (msg: string) => EdgeDBError;

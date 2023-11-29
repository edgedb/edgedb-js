export type ParamsOrError<
  Result extends object,
  ErrorDetails extends object = {}
> =
  | ({ error: null } & { [Key in keyof ErrorDetails]?: undefined } & Result)
  | ({ error: Error } & ErrorDetails & { [Key in keyof Result]?: undefined });

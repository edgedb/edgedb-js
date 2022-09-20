export class EdgeDBError extends Error {
  source?: Error;
  protected static tags: object = {};
  private _message: string;
  private _query?: string;
  private _attrs?: Map<number, Buffer>;

  constructor(message?: string, options?: ErrorOptions) {
    super(undefined, options);
    Object.defineProperties(this, {
      _message: {enumerable: false},
      _query: {enumerable: false},
      _attrs: {enumerable: false},
    });
    this._message = message ?? "";
  }

  get message() {
    return (
      this._message +
      (this._query && this._attrs
        ? prettyPrintError(this._attrs, this._query)
        : "")
    );
  }

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

enum ErrorAttr {
  hint = 1,
  details = 2,
  serverTraceback = 257,
  positionStart = -15,
  positionEnd = -14,
  lineStart = -13,
  columnStart = -12,
  utf16ColumnStart = -11,
  lineEnd = -10,
  columnEnd = -9,
  utf16ColumnEnd = -8,
  characterStart = -7,
  characterEnd = -6,
}

function tryParseInt(val: any) {
  if (Buffer.isBuffer(val)) {
    try {
      return parseInt(val.toString("utf8"), 10);
    } catch {}
  }
  return null;
}

export function prettyPrintError(attrs: Map<number, Buffer>, query: string) {
  const lineStart = tryParseInt(attrs.get(ErrorAttr.lineStart));
  const lineEnd = tryParseInt(attrs.get(ErrorAttr.lineEnd));
  const colStart = tryParseInt(attrs.get(ErrorAttr.utf16ColumnStart));
  const colEnd = tryParseInt(attrs.get(ErrorAttr.utf16ColumnEnd));

  if (
    lineStart == null ||
    lineEnd == null ||
    colStart == null ||
    colEnd == null
  ) {
    return "";
  }

  const queryLines = query.split("\n");

  const lineNoWidth = lineEnd.toString().length;
  let errMessage = "\n";

  errMessage += "|".padStart(lineNoWidth + 3) + "\n";

  for (let i = lineStart; i < lineEnd + 1; i++) {
    const line = queryLines[i - 1];
    const start = i === lineStart ? colStart : 0;
    const end = i === lineEnd ? colEnd : line.length;
    errMessage += ` ${i.toString().padStart(lineNoWidth)} | ${line}\n`;
    errMessage += `${"|".padStart(lineNoWidth + 3)} ${""
      .padStart(end - start, "^")
      .padStart(end)}\n`;
  }
  if (attrs.has(ErrorAttr.hint)) {
    errMessage += `Hint: ${attrs.get(ErrorAttr.hint)?.toString("utf8")}\n`;
  }

  return errMessage;
}

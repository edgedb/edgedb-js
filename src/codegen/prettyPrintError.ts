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

export function prettyPrintError(err: any, query: string) {
  const attrs = err.attrs;

  if (attrs == null || !(attrs instanceof Map)) {
    return err.toString();
  }

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
    return err.toString();
  }

  const queryLines = query.split("\n");

  const lineNoWidth = lineEnd.toString().length;
  let errMessage = err.toString() + "\n";

  errMessage += "|".padStart(lineNoWidth + 3) + "\n";

  for (var i = lineStart; i < lineEnd + 1; i++) {
    const line = queryLines[i - 1];
    const start = i == lineStart ? colStart : 0;
    const end = i == lineEnd ? colEnd : line.length;
    errMessage += ` ${i.toString().padStart(lineNoWidth)} | ${line}\n`;
    errMessage += `${"|".padStart(lineNoWidth + 3)} ${""
      .padStart(end - start, "^")
      .padStart(end)}\n`;
  }
  if (attrs.has(ErrorAttr.hint)) {
    errMessage += `Hint: ${attrs.get(ErrorAttr.hint).toString("utf8")}\n`;
  }

  return errMessage;
}

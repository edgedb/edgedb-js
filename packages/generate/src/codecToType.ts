import type {ParseResult} from "edgedb/dist/baseConn";
import {ArrayCodec} from "edgedb/dist/codecs/array";
import {AT_LEAST_ONE, AT_MOST_ONE, MANY, ONE} from "edgedb/dist/codecs/consts";
import {EnumCodec} from "edgedb/dist/codecs/enum";
import {ICodec, ScalarCodec} from "edgedb/dist/codecs/ifaces";
import {NamedTupleCodec} from "edgedb/dist/codecs/namedtuple";
import {ObjectCodec} from "edgedb/dist/codecs/object";
import {RangeCodec} from "edgedb/dist/codecs/range";
import {NullCodec} from "edgedb/dist/codecs/codecs";
import {SetCodec} from "edgedb/dist/codecs/set";
import {TupleCodec} from "edgedb/dist/codecs/tuple";
import {Cardinality, OutputFormat} from "edgedb/dist/ifaces";
import {Options, Session} from "edgedb/dist/options";
import type {Client} from "edgedb";
import type {ClientPool} from "edgedb/dist/client";
import {prettyPrintError} from "./prettyPrint";

export type QueryType = {
  args: string;
  out: string;
  cardinality: Cardinality;
  query: string;
  imports: Set<string>;
};
export async function generateQueryType(
  client: Client,
  query: string
): Promise<QueryType> {
  let parseResult: ParseResult;
  const pool: ClientPool = (client as any).pool;

  const holder = await pool.acquireHolder(Options.defaults());
  try {
    const cxn = await holder._getConnection();
    parseResult = await cxn._parse(
      query,
      OutputFormat.BINARY,
      Cardinality.MANY,
      Session.defaults(),
      false
    );
  } catch (err) {
    throw new Error(prettyPrintError(err, query));
  } finally {
    await holder.release();
  }

  const cardinality = parseResult[0];
  const inCodec = parseResult[1];
  const outCodec = parseResult[2];
  const imports = new Set<string>();
  const args = walkCodec(inCodec, {
    indent: "",
    optionalNulls: true,
    imports
  });

  const out = generateSetType(
    walkCodec(outCodec, {
      indent: "",
      optionalNulls: false,
      imports
    }),
    cardinality
  );

  return {
    out,
    args,
    cardinality,
    query,
    imports
  };
}

function generateSetType(type: string, cardinality: Cardinality): string {
  switch (cardinality) {
    case Cardinality.MANY:
      return `${type}[]`;
    case Cardinality.ONE:
      return type;
    case Cardinality.AT_MOST_ONE:
      return `${type} | null`;
    case Cardinality.AT_LEAST_ONE:
      return `[(${type}), ...(${type})[]]`;
  }
  throw Error(`unexpected cardinality: ${cardinality}`);
}

// type AtLeastOne<T> = [T, ...T[]];

function walkCodec(
  codec: ICodec,
  ctx: {indent: string; optionalNulls: boolean; imports: Set<string>}
): string {
  if (codec instanceof NullCodec) {
    return "null";
  }
  if (codec instanceof ScalarCodec) {
    if (codec instanceof EnumCodec) {
      return codec.values.map(val => JSON.stringify(val)).join(" | ");
    }
    if (codec.importedType) {
      ctx.imports.add(codec.tsType);
    }
    return codec.tsType;
  }
  if (codec instanceof ObjectCodec || codec instanceof NamedTupleCodec) {
    const fields =
      codec instanceof ObjectCodec
        ? codec.getFields()
        : codec.getNames().map(name => ({name, cardinality: ONE}));
    const subCodecs = codec.getSubcodecs();
    return `{\n${fields
      .map((field, i) => {
        let subCodec = subCodecs[i];
        if (subCodec instanceof SetCodec) {
          if (
            !(field.cardinality === MANY || field.cardinality === AT_LEAST_ONE)
          ) {
            throw Error("subcodec is SetCodec, but upper cardinality is one");
          }
          subCodec = subCodec.getSubcodecs()[0];
        }
        return `${ctx.indent}  ${JSON.stringify(field.name)}${
          ctx.optionalNulls && field.cardinality === AT_MOST_ONE ? "?" : ""
        }: ${generateSetType(
          walkCodec(subCodec, {...ctx, indent: ctx.indent + "  "}),
          field.cardinality
        )};`;
      })
      .join("\n")}\n${ctx.indent}}`;
  }
  if (codec instanceof ArrayCodec) {
    return `${walkCodec(codec.getSubcodecs()[0], ctx)}[]`;
  }
  if (codec instanceof TupleCodec) {
    return `[${codec
      .getSubcodecs()
      .map(subCodec => walkCodec(subCodec, ctx))
      .join(", ")}]`;
  }
  if (codec instanceof RangeCodec) {
    const subCodec = codec.getSubcodecs()[0];
    if (!(subCodec instanceof ScalarCodec)) {
      throw Error("expected range subtype to be scalar type");
    }
    ctx.imports.add("Range");
    return `Range<${subCodec.tsType}>`;
  }
  throw Error(`Unexpected codec kind: ${codec.getKind()}`);
}

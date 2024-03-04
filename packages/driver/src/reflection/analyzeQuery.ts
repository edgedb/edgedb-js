import { ArrayCodec } from "../codecs/array";
import { EnumCodec } from "../codecs/enum";
import type { ICodec } from "../codecs/ifaces";
import { ScalarCodec } from "../codecs/ifaces";
import { NamedTupleCodec } from "../codecs/namedtuple";
import { ObjectCodec } from "../codecs/object";
import { MultiRangeCodec, RangeCodec } from "../codecs/range";
import { NullCodec } from "../codecs/codecs";
import { SetCodec } from "../codecs/set";
import { TupleCodec } from "../codecs/tuple";
import type { Client } from "../baseClient";
import { Cardinality } from "./enums";
import { util } from "./util";

type QueryType = {
  args: string;
  result: string;
  cardinality: Cardinality;
  query: string;
  imports: Set<string>;
};

export async function analyzeQuery(
  client: Client,
  query: string
): Promise<QueryType> {
  const { cardinality, in: inCodec, out: outCodec } = await client.parse(query);

  const imports = new Set<string>();
  const args = walkCodec(inCodec, {
    indent: "",
    optionalNulls: true,
    readonly: true,
    imports,
  });

  const result = applyCardinalityToTsType(
    walkCodec(outCodec, {
      indent: "",
      optionalNulls: false,
      readonly: false,
      imports,
    }),
    cardinality
  );

  return {
    result,
    args,
    cardinality,
    query,
    imports,
  };
}

export function applyCardinalityToTsType(
  type: string,
  cardinality: Cardinality
): string {
  switch (cardinality) {
    case Cardinality.Many:
      return `${type}[]`;
    case Cardinality.One:
      return type;
    case Cardinality.AtMostOne:
      return `${type} | null`;
    case Cardinality.AtLeastOne:
      return `[(${type}), ...(${type})[]]`;
  }
  throw Error(`unexpected cardinality: ${cardinality}`);
}

// type AtLeastOne<T> = [T, ...T[]];

export { walkCodec as walkCodecToTsType };
function walkCodec(
  codec: ICodec,
  ctx: {
    indent: string;
    optionalNulls: boolean;
    readonly: boolean;
    imports: Set<string>;
  }
): string {
  if (codec instanceof NullCodec) {
    return "null";
  }
  if (codec instanceof ScalarCodec) {
    if (codec instanceof EnumCodec) {
      return `(${codec.values.map((val) => JSON.stringify(val)).join(" | ")})`;
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
        : codec.getNames().map((name) => ({ name, cardinality: undefined }));
    const subCodecs = codec.getSubcodecs();
    const objectShape = `{\n${fields
      .map((field, i) => {
        const cardinality = field.cardinality
          ? util.parseCardinality(field.cardinality)
          : Cardinality.One;
        let subCodec = subCodecs[i];
        if (subCodec instanceof SetCodec) {
          if (
            !(
              cardinality === Cardinality.Many ||
              cardinality === Cardinality.AtLeastOne
            )
          ) {
            throw Error("subcodec is SetCodec, but upper cardinality is one");
          }
          subCodec = subCodec.getSubcodecs()[0];
        }
        return `${ctx.indent}  ${JSON.stringify(field.name)}${
          ctx.optionalNulls && cardinality === Cardinality.AtMostOne ? "?" : ""
        }: ${applyCardinalityToTsType(
          walkCodec(subCodec, { ...ctx, indent: ctx.indent + "  " }),
          cardinality
        )};`;
      })
      .join("\n")}\n${ctx.indent}}`;
    return ctx.readonly ? `Readonly<${objectShape}>` : objectShape;
  }
  if (codec instanceof ArrayCodec) {
    return `${ctx.readonly ? "readonly " : ""}${walkCodec(
      codec.getSubcodecs()[0],
      ctx
    )}[]`;
  }
  if (codec instanceof TupleCodec) {
    return `${ctx.readonly ? "readonly " : ""}[${codec
      .getSubcodecs()
      .map((subCodec) => walkCodec(subCodec, ctx))
      .join(", ")}]`;
  }
  if (codec instanceof RangeCodec) {
    const subCodec = codec.getSubcodecs()[0];
    if (!(subCodec instanceof ScalarCodec)) {
      throw Error("expected range subtype to be scalar type");
    }
    ctx.imports.add("Range");
    return `Range<${walkCodec(subCodec, ctx)}>`;
  }
  if (codec instanceof MultiRangeCodec) {
    const subCodec = codec.getSubcodecs()[0];
    if (!(subCodec instanceof ScalarCodec)) {
      throw Error("expected multirange subtype to be scalar type");
    }
    ctx.imports.add("MultiRange");
    return `MultiRange<${walkCodec(subCodec, ctx)}>`;
  }
  throw Error(`Unexpected codec kind: ${codec.getKind()}`);
}

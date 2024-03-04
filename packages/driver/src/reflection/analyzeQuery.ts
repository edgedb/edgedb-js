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

  const args = generateTSTypeFromCodec(inCodec, Cardinality.One, {
    optionalNulls: true,
    readonly: true,
  });
  const result = generateTSTypeFromCodec(outCodec, cardinality);

  return {
    result: result.type,
    args: args.type,
    cardinality,
    query,
    imports: new Set([...args.imports, ...result.imports]),
  };
}

type AbstractClass<T> = (abstract new (...arguments_: any[]) => T) & {
  prototype: T;
};

type CodecLike = ICodec | ScalarCodec;

export type CodecGenerator<Codec extends CodecLike = CodecLike> = (
  codec: Codec,
  context: CodecGeneratorContext
) => string;

type CodecGeneratorMap = ReadonlyMap<AbstractClass<CodecLike>, CodecGenerator>;

export type CodecGeneratorContext = {
  indent: string;
  optionalNulls: boolean;
  readonly: boolean;
  imports: Set<string>;
  walk: (codec: CodecLike, context?: CodecGeneratorContext) => string;
  generators: CodecGeneratorMap;
  applyCardinality: (type: string, cardinality: Cardinality) => string;
};

export type CodecGenerationOptions = Partial<
  Pick<
    CodecGeneratorContext,
    "optionalNulls" | "readonly" | "generators" | "applyCardinality"
  >
>;

export const generateTSTypeFromCodec = (
  codec: ICodec,
  cardinality: Cardinality = Cardinality.One,
  options: CodecGenerationOptions = {}
) => {
  const optionsWithDefaults = {
    indent: "",
    optionalNulls: false,
    readonly: false,
    ...options,
  };
  const context: CodecGeneratorContext = {
    ...optionsWithDefaults,
    generators: defaultCodecGenerators,
    applyCardinality: defaultApplyCardinalityToTsType(optionsWithDefaults),
    ...options,
    imports: new Set(),
    walk: (codec, innerContext) => {
      innerContext ??= context;
      for (const [type, generator] of innerContext.generators) {
        if (codec instanceof type) {
          return generator(codec, innerContext);
        }
      }
      throw new Error(`Unexpected codec kind: ${codec.getKind()}`);
    },
  };
  const type = context.applyCardinality(
    context.walk(codec, context),
    cardinality
  );
  return {
    type,
    imports: context.imports,
  };
};

/** A helper function to define a codec generator tuple. */
const genDef = <Codec extends CodecLike>(
  codecType: AbstractClass<Codec>,
  generator: CodecGenerator<Codec>
) =>
  [codecType as AbstractClass<CodecLike>, generator as CodecGenerator] as const;
export { genDef as defineCodecGeneratorTuple };

export const defaultCodecGenerators: CodecGeneratorMap = new Map([
  genDef(NullCodec, () => "null"),
  genDef(EnumCodec, (codec) => {
    return `(${codec.values.map((val) => JSON.stringify(val)).join(" | ")})`;
  }),
  genDef(ScalarCodec, (codec, ctx) => {
    if (codec.importedType) {
      ctx.imports.add(codec.tsType);
    }
    return codec.tsType;
  }),
  genDef(ObjectCodec, (codec, ctx) => {
    const subCodecs = codec.getSubcodecs();
    const fields = codec.getFields().map((field, i) => ({
      name: field.name,
      codec: subCodecs[i],
      cardinality: util.parseCardinality(field.cardinality),
    }));
    return generateTsObject(fields, ctx);
  }),
  genDef(NamedTupleCodec, (codec, ctx) => {
    const subCodecs = codec.getSubcodecs();
    const fields = codec.getNames().map((name, i) => ({
      name,
      codec: subCodecs[i],
      cardinality: Cardinality.One,
    }));
    return generateTsObject(fields, ctx);
  }),
  genDef(TupleCodec, (codec, ctx) => {
    const subCodecs = codec
      .getSubcodecs()
      .map((subCodec) => ctx.walk(subCodec));
    return `${ctx.readonly ? "readonly " : ""}[${subCodecs.join(", ")}]`;
  }),
  genDef(ArrayCodec, (codec, ctx) =>
    ctx.applyCardinality(ctx.walk(codec.getSubcodecs()[0]), Cardinality.Many)
  ),
  genDef(RangeCodec, (codec, ctx) => {
    const subCodec = codec.getSubcodecs()[0];
    if (!(subCodec instanceof ScalarCodec)) {
      throw Error("expected range subtype to be scalar type");
    }
    ctx.imports.add("Range");
    return `Range<${ctx.walk(subCodec)}>`;
  }),
  genDef(MultiRangeCodec, (codec, ctx) => {
    const subCodec = codec.getSubcodecs()[0];
    if (!(subCodec instanceof ScalarCodec)) {
      throw Error("expected multirange subtype to be scalar type");
    }
    ctx.imports.add("MultiRange");
    return `MultiRange<${ctx.walk(subCodec)}>`;
  }),
]);

export const generateTsObject = (
  fields: Array<Parameters<typeof generateTsObjectField>[0]>,
  ctx: CodecGeneratorContext
) => {
  const properties = fields.map((field) => generateTsObjectField(field, ctx));
  return `{\n${properties.join("\n")}\n${ctx.indent}}`;
};

export const generateTsObjectField = (
  field: { name: string; cardinality: Cardinality; codec: ICodec },
  ctx: CodecGeneratorContext
) => {
  const codec = unwrapSetCodec(field.codec, field.cardinality);

  const name = JSON.stringify(field.name);
  const value = ctx.applyCardinality(
    ctx.walk(codec, { ...ctx, indent: ctx.indent + "  " }),
    field.cardinality
  );
  const optional =
    ctx.optionalNulls && field.cardinality === Cardinality.AtMostOne;
  const questionMark = optional ? "?" : "";
  const isReadonly = ctx.readonly ? "readonly " : "";
  return `${ctx.indent}  ${isReadonly}${name}${questionMark}: ${value};`;
};

function unwrapSetCodec(codec: ICodec, cardinality: Cardinality) {
  if (!(codec instanceof SetCodec)) {
    return codec;
  }
  if (
    cardinality === Cardinality.Many ||
    cardinality === Cardinality.AtLeastOne
  ) {
    return codec.getSubcodecs()[0];
  }
  throw new Error("Sub-codec is SetCodec, but upper cardinality is one");
}

export const defaultApplyCardinalityToTsType =
  (ctx: Pick<CodecGeneratorContext, "readonly">) =>
  (type: string, cardinality: Cardinality): string => {
    switch (cardinality) {
      case Cardinality.Many:
        return `${ctx.readonly ? "readonly " : ""}${type}[]`;
      case Cardinality.One:
        return type;
      case Cardinality.AtMostOne:
        return `${type} | null`;
      case Cardinality.AtLeastOne:
        return `${ctx.readonly ? "readonly " : ""}[(${type}), ...(${type})[]]`;
    }
    throw new Error(`Unexpected cardinality: ${cardinality}`);
  };

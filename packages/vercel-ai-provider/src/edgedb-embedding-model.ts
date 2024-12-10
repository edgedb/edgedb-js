import {
  type EmbeddingModelV1,
  TooManyEmbeddingValuesForCallError,
} from "@ai-sdk/provider";
import {
  createJsonResponseHandler,
  type FetchFunction,
  postJsonToApi,
  combineHeaders,
} from "@ai-sdk/provider-utils";
import { z } from "zod";
import {
  isMistralEmbeddingModel,
  type EdgeDBEmbeddingModelId,
  type EdgeDBEmbeddingSettings,
} from "./edgedb-embedding-settings";
import { edgedbFailedResponseHandler } from "./edgedb-error";

interface EdgeDBEmbeddingConfig {
  provider: string;
  fetch?: FetchFunction;
  baseURL: string | null;
  headers: () => Record<string, string | undefined>;
}

export class EdgeDBEmbeddingModel implements EmbeddingModelV1<string> {
  readonly specificationVersion = "v1";
  readonly modelId: EdgeDBEmbeddingModelId;

  private readonly config: EdgeDBEmbeddingConfig;
  private readonly settings: EdgeDBEmbeddingSettings;

  constructor(
    modelId: EdgeDBEmbeddingModelId,
    settings: EdgeDBEmbeddingSettings,
    config: EdgeDBEmbeddingConfig,
  ) {
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
  }

  get provider(): string {
    return this.config.provider;
  }

  // Mistral provider uses 32 by default, OpenAI uses 2048
  get maxEmbeddingsPerCall(): number {
    return (
      this.settings.maxEmbeddingsPerCall ??
      (isMistralEmbeddingModel(this.modelId) ? 32 : 2048)
    );
  }

  // I didn't find any usage of this in the vercel provider
  get supportsParallelCalls(): boolean {
    return this.settings.supportsParallelCalls ?? true;
  }

  async doEmbed({
    values,
    abortSignal,
    headers,
  }: Parameters<EmbeddingModelV1<string>["doEmbed"]>[0]): Promise<
    Awaited<ReturnType<EmbeddingModelV1<string>["doEmbed"]>>
  > {
    if (values.length > this.maxEmbeddingsPerCall) {
      throw new TooManyEmbeddingValuesForCallError({
        provider: this.provider,
        modelId: this.modelId,
        maxEmbeddingsPerCall: this.maxEmbeddingsPerCall,
        values,
      });
    }

    const { responseHeaders, value: response } = await postJsonToApi({
      url: this.config.baseURL
        ? `${this.config.baseURL}/embeddings`
        : "embeddings",
      headers: combineHeaders(this.config.headers(), headers),
      body: {
        model: this.modelId,
        input: values,
        encoding_format: "float",
        // OpenAI props
        dimensions: this.settings.dimensions,
        user: this.settings.user,
      },
      failedResponseHandler: edgedbFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        EdgeDBTextEmbeddingResponseSchema,
      ),
      abortSignal,
      fetch: this.config.fetch,
    });

    return {
      embeddings: response.data.map((item) => item.embedding),
      usage: response.usage
        ? { tokens: response.usage.prompt_tokens }
        : undefined,
      rawResponse: { headers: responseHeaders },
    };
  }
}

const EdgeDBTextEmbeddingResponseSchema = z.object({
  data: z.array(z.object({ embedding: z.array(z.number()) })),
  usage: z.object({ prompt_tokens: z.number() }).nullish(),
});

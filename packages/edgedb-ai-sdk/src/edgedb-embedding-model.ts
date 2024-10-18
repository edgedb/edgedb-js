import {
  type EmbeddingModelV1,
  TooManyEmbeddingValuesForCallError,
} from "@ai-sdk/provider";
import {
  createJsonResponseHandler,
  type FetchFunction,
  postJsonToApi,
} from "@ai-sdk/provider-utils";
import { z } from "zod";
import type {
  EdgeDBRagEmbeddingModelId,
  EdgeDBRagEmbeddingSettings,
} from "./edgedb-embedding-settings";
import { edgedbFailedResponseHandler } from "./edgedb-error";

interface EdgeDBEmbeddingConfig {
  provider: string;
  fetch?: FetchFunction;
}

export class EdgeDBEmbeddingModel implements EmbeddingModelV1<string> {
  readonly specificationVersion = "v1";
  readonly modelId: EdgeDBRagEmbeddingModelId;

  private readonly config: EdgeDBEmbeddingConfig;
  private readonly settings: EdgeDBRagEmbeddingSettings;

  get provider(): string {
    return this.config.provider;
  }

  // this default number should depend on the LLM that is used
  // mistral provider uses 32, openai uses 2048
  // cohere uses 96 and is not editable in their provider ...
  get maxEmbeddingsPerCall(): number {
    return this.settings.maxEmbeddingsPerCall ?? 32;
  }

  // I didn't find any usage of this in the vercel provider
  get supportsParallelCalls(): boolean {
    return this.settings.supportsParallelCalls ?? true;
  }

  constructor(
    modelId: EdgeDBRagEmbeddingModelId,
    settings: EdgeDBRagEmbeddingSettings,
    config: EdgeDBEmbeddingConfig,
  ) {
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
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
      url: `embeddings`,
      headers,
      body: {
        model: this.modelId,
        input: values,
        encoding_format: "float",
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

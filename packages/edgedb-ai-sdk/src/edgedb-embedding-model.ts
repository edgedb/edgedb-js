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
import type { EdgeDBEmbeddingModelId } from "./edgedb-embedding-settings";
import { edgedbFailedResponseHandler } from "./edgedb-error";

interface EdgeDBEmbeddingConfig {
  provider: string;
  fetch?: FetchFunction;
}

export class EdgeDBEmbeddingModel implements EmbeddingModelV1<string> {
  readonly specificationVersion = "v1";
  readonly modelId: EdgeDBEmbeddingModelId;

  private readonly config: EdgeDBEmbeddingConfig;

  get provider(): string {
    return this.config.provider;
  }

  get maxEmbeddingsPerCall(): number {
    // todo is this used, can it be updated?
    return 32;
  }

  get supportsParallelCalls(): boolean {
    return false;
  }

  constructor(modelId: EdgeDBEmbeddingModelId, config: EdgeDBEmbeddingConfig) {
    this.modelId = modelId;
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

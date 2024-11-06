import { type Client, createClient } from "edgedb";
import type { ResolvedConnectConfig } from "edgedb/dist/conUtils.js";
import { getHTTPSCRAMAuth } from "edgedb/dist/httpScram.js";
import { cryptoUtils } from "edgedb/dist/browserCrypto.js";
import { getAuthenticatedFetch } from "edgedb/dist/utils.js";
import type {
  EmbeddingModelV1,
  LanguageModelV1,
  ProviderV1,
} from "@ai-sdk/provider";
import {
  EdgeDBRagLanguageModel,
  type EdgeDBLanguageModel,
} from "./edgedb-rag-language-model";
import type {
  EdgeDBRagModelId,
  EdgeDBRagSettings,
} from "./edgedb-rag-settings";
import { EdgeDBEmbeddingModel } from "./edgedb-embedding-model";
import type {
  EdgeDBEmbeddingModelId,
  EdgeDBEmbeddingSettings,
} from "./edgedb-embedding-settings";

const httpSCRAMAuth = getHTTPSCRAMAuth(cryptoUtils);

export interface EdgeDBRagProvider extends ProviderV1 {
  (modelId: EdgeDBRagModelId | EdgeDBEmbeddingModelId): LanguageModelV1;

  languageModel(
    modelId: EdgeDBRagModelId,
    settings?: EdgeDBRagSettings,
  ): EdgeDBLanguageModel;

  textEmbeddingModel: (
    modelId: EdgeDBEmbeddingModelId,
    settings?: EdgeDBEmbeddingSettings,
  ) => EmbeddingModelV1<string>;
}

export async function createEdgeDBRag(
  client: Client,
): Promise<EdgeDBRagProvider> {
  const connectConfig: ResolvedConnectConfig = (
    await (client as any).pool._getNormalizedConnectConfig()
  ).connectionParams;

  const fetch = await getAuthenticatedFetch(
    connectConfig,
    httpSCRAMAuth,
    "ext/ai/",
  );

  const createChatModel = (
    modelId: EdgeDBRagModelId,
    settings: EdgeDBRagSettings = {},
  ) =>
    new EdgeDBRagLanguageModel(modelId, settings, {
      provider: "edgedb.rag",
      fetch,
    });

  const createEmbeddingModel = (
    modelId: EdgeDBEmbeddingModelId,
    settings: EdgeDBEmbeddingSettings = {},
  ) => {
    return new EdgeDBEmbeddingModel(modelId, settings, {
      provider: "edgedb.embedding",
      fetch,
    });
  };

  const provider = function (modelId: EdgeDBRagModelId) {
    if (new.target) {
      throw new Error(
        "The EdgeDB model function cannot be called with the new keyword.",
      );
    }

    return createChatModel(modelId);
  };

  provider.languageModel = createChatModel;
  provider.textEmbeddingModel = createEmbeddingModel;

  return provider;
}

/**
Default EdgeDB provider instance.
 */
export const edgedbRag = createEdgeDBRag(createClient());

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
  EdgeDBChatLanguageModel,
  type EdgeDBLanguageModel,
} from "./edgedb-chat-language-model";
import type {
  EdgeDBChatModelId,
  EdgeDBChatSettings,
} from "./edgedb-chat-settings";
import { EdgeDBEmbeddingModel } from "./edgedb-embedding-model";
import type {
  EdgeDBEmbeddingModelId,
  EdgeDBEmbeddingSettings,
} from "./edgedb-embedding-settings";

const httpSCRAMAuth = getHTTPSCRAMAuth(cryptoUtils);

export interface EdgeDBProvider extends ProviderV1 {
  (modelId: EdgeDBChatModelId | EdgeDBEmbeddingModelId): LanguageModelV1;

  languageModel(
    modelId: EdgeDBChatModelId,
    settings?: EdgeDBChatSettings,
  ): EdgeDBLanguageModel;

  textEmbeddingModel: (
    modelId: EdgeDBEmbeddingModelId,
    settings?: EdgeDBEmbeddingSettings,
  ) => EmbeddingModelV1<string>;
}

export async function createEdgeDB(client: Client): Promise<EdgeDBProvider> {
  const connectConfig: ResolvedConnectConfig = (
    await (client as any).pool._getNormalizedConnectConfig()
  ).connectionParams;

  const fetch = await getAuthenticatedFetch(
    connectConfig,
    httpSCRAMAuth,
    "ext/ai/",
  );

  const createChatModel = (
    modelId: EdgeDBChatModelId,
    settings: EdgeDBChatSettings = {},
  ) =>
    new EdgeDBChatLanguageModel(modelId, settings, {
      provider: "edgedb.chat",
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

  const provider = function (modelId: EdgeDBChatModelId) {
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
Default provider instance.
 */
export const edgedb = createEdgeDB(createClient());

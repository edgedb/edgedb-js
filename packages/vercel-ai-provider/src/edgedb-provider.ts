import { type Client, createClient } from "edgedb";
import { getHTTPSCRAMAuth } from "edgedb/dist/httpScram.js";
import { cryptoUtils } from "edgedb/dist/browserCrypto.js";
import { getAuthenticatedFetch } from "edgedb/dist/utils.js";
import type {
  EmbeddingModelV1,
  LanguageModelV1,
  ProviderV1,
} from "@ai-sdk/provider";
import { withoutTrailingSlash } from "@ai-sdk/provider-utils";
import { EdgeDBChatLanguageModel } from "./edgedb-chat-language-model";
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
  (
    modelId: EdgeDBChatModelId | EdgeDBEmbeddingModelId,
    settings?: EdgeDBChatSettings,
  ): LanguageModelV1;

  languageModel(
    modelId: EdgeDBChatModelId,
    settings?: EdgeDBChatSettings,
  ): EdgeDBChatLanguageModel;

  textEmbeddingModel: (
    modelId: EdgeDBEmbeddingModelId,
    settings?: EdgeDBEmbeddingSettings,
  ) => EmbeddingModelV1<string>;
}

export interface EdgeDBProviderSettings {
  /**
Use a different URL prefix for API calls, e.g. to use proxy servers.
The default prefix is `https://api.mistral.ai/v1`.
   */
  baseURL?: string;

  /**
Custom headers to include in the requests.
     */
  headers?: Record<string, string>;
}

export async function createEdgeDB(
  client: Client,
  options: EdgeDBProviderSettings = {},
): Promise<EdgeDBProvider> {
  const connectConfig = await client.resolveConnectionParams();
  const baseURL = withoutTrailingSlash(options.baseURL) ?? "";

  const getHeaders = () => ({
    ...options.headers,
  });

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
      baseURL,
      headers: getHeaders,
    });

  const createEmbeddingModel = (
    modelId: EdgeDBEmbeddingModelId,
    settings: EdgeDBEmbeddingSettings = {},
  ) => {
    return new EdgeDBEmbeddingModel(modelId, settings, {
      provider: "edgedb.embedding",
      fetch,
      baseURL,
      headers: getHeaders,
    });
  };

  const provider = function (
    modelId: EdgeDBChatModelId,
    settings?: EdgeDBChatSettings,
  ) {
    if (new.target) {
      throw new Error(
        "The EdgeDB model function cannot be called with the new keyword.",
      );
    }

    return createChatModel(modelId, settings);
  };

  provider.languageModel = createChatModel;
  provider.textEmbeddingModel = createEmbeddingModel;

  return provider;
}

/**
Default provider instance.
 */
export const edgedb = createEdgeDB(createClient());

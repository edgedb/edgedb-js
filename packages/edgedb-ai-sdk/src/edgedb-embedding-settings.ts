export type EdgeDBRagEmbeddingModelId =
  | "text-embedding-ada-002"
  | "text-embedding-3-small"
  | "text-embedding-3-large"
  | "mistral-embed"
  | (string & {});

export interface EdgeDBRagEmbeddingSettings {
  /**
  Override the maximum number of embeddings per call.
     */
  maxEmbeddingsPerCall?: number;

  /**
  Override the parallelism of embedding calls.
      */
  supportsParallelCalls?: boolean;
}

import type { FetchFunction } from "@ai-sdk/provider-utils";

export type EdgeDBChatModelId =
  | "gpt-4-turbo-preview"
  | "gpt-3.5-turbo"
  | "text-embedding-3-small"
  | "text-embedding-3-large"
  | "text-embedding-ada-002"
  | "mistral-embed"
  | "mistral-small-latest"
  | "mistral-medium-latest"
  | "mistral-large-latest"
  | "claude-3-haiku-20240307"
  | "claude-3-sonnet-20240229"
  | "claude-3-opus-20240229"
  | (string & {});

export type ChatParticipantRole = "system" | "user" | "assistant" | "tool";

export type Prompt =
  | { name: string }
  | { id: string }
  | { custom: { role: ChatParticipantRole; content: string }[] };

export interface QueryContext {
  query: string;
  variables?: Record<string, unknown>;
  globals?: Record<string, unknown>;
  max_object_count?: number;
}

export interface EdgeDBChatConfig {
  provider: string;
  fetch: FetchFunction;
}

export interface EdgeDBChatSettings {
  context?: QueryContext;
  prompt?: Prompt;
}

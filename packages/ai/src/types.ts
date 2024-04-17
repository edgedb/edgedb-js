export type ChatParticipantRole = "system" | "user" | "assistant" | "tool";

export type Prompt =
  | { name: string }
  | { id: string }
  | { custom: { role: ChatParticipantRole; content: string }[] };

export interface AIOptions {
  model?: string;
  prompt?: Prompt;
}

export interface QueryContext {
  query: string;
  variables?: Record<string, unknown>;
  globals?: Record<string, unknown>;
  max_object_count?: number;
}

export interface RAGRequest {
  model: string;
  prompt: Prompt;
  context: QueryContext;
  query: string;
  stream?: boolean;
}

export type ChatParticipantRole = "system" | "user" | "assistant" | "tool";

export type Prompt =
  | { name: string }
  | { id: string }
  | { custom: { role: ChatParticipantRole; content: string }[] };

export interface AIOptions {
  model: string;
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
  prompt?: Prompt;
  context: QueryContext;
  query: string;
  stream?: boolean;
}

export interface MessageStart {
  type: "message_start";
  message: {
    role: "assistant" | "system" | "user";
    id: string;
    model: string;
  };
}

export interface ContentBlockStart {
  type: "content_block_start";
  index: number;
  content_block: {
    text: string;
    type: "text";
  };
}

export interface ContentBlockDelta {
  type: "content_block_delta";
  index: number;
  delta: {
    text: string;
    type: "text_delta";
  };
}

export interface ContentBlockStop {
  type: "content_block_stop";
  index: number;
}

export interface MessageDelta {
  type: "message_delta";
  delta: {
    stop_reason: string;
  };
}

export interface MessageStop {
  type: "message_stop";
}

export type StreamingMessage =
  | MessageStart
  | ContentBlockStart
  | ContentBlockDelta
  | ContentBlockStop
  | MessageDelta
  | MessageStop;

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

export type MessageStart = {
  type: "message_start";
  message: {
    role: "assistant" | "system" | "user";
    id: string;
    model: string;
  };
};

export type ContentBlockStart = {
  type: "content_block_start";
  index: number;
  content_block: {
    text: string;
    type: "text";
  };
};

export type ContentBlockDelta = {
  type: "content_block_delta";
  delta: {
    type: "text_delta";
    text: string;
  };
  index: number;
};

export type ContentBlockStop = {
  type: "content_block_stop";
  index: number;
};

export type MessageDelta = {
  type: "message_delta";
  delta: {
    stop_reason: "stop";
  };
};

export type MessageStop = {
  type: "message_stop";
};

export type StreamingMessage =
  | MessageStart
  | ContentBlockStart
  | ContentBlockDelta
  | ContentBlockStop
  | MessageDelta
  | MessageStop;

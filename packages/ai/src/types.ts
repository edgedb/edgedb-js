export type ChatParticipantRole = "system" | "user" | "assistant" | "tool";

export interface EdgeDBSystemMessage {
  role: "system";
  content: string;
}

export interface EdgeDBUserMessage {
  role: "user";
  content: { type: "text"; text: string }[];
}

export interface EdgeDBAssistantMessage {
  role: "assistant";
  content: string;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
}

export interface EdgeDBToolMessage {
  role: "tool";
  content: string;
  tool_call_id: string;
}

export type EdgeDBMessage =
  | EdgeDBSystemMessage
  | EdgeDBUserMessage
  | EdgeDBAssistantMessage
  | EdgeDBToolMessage;

export type Prompt =
  | { name: string; custom?: EdgeDBMessage[] }
  | { id: string; custom?: EdgeDBMessage[] }
  | { custom: EdgeDBMessage[] };

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

interface RagRequestBase {
  stream?: boolean;
  [key: string]: unknown;
}

export type RagRequestPrompt = RagRequestBase & {
  prompt: string;
};

export type RagRequestMessages = RagRequestBase & {
  messages: EdgeDBMessage[];
};

export type RagRequest = RagRequestPrompt | RagRequestMessages;

export function isPromptRequest(
  request: RagRequest,
): request is RagRequestPrompt {
  return "prompt" in request;
}

export interface MessageStart {
  type: "message_start";
  message: {
    id: string;
    model: string;
    role: "assistant" | "system" | "user"; //todo check this;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
    } | null;
  };
}

export interface ContentBlockStart {
  type: "content_block_start";
  index: number;
  content_block:
    | {
        type: "text";
        text: string;
      }
    | {
        type: "tool_use";
        id?: string | null;
        name: string;
        args?: string | null;
      };
}

export interface ContentBlockDelta {
  type: "content_block_delta";
  index: number;
  delta:
    | {
        type: "text_delta";
        text: string;
      }
    | {
        type: "tool_call_delta";
        args: string;
      };
  logprobs?: {
    tokens: string[];
    token_logprobs: number[];
    top_logprobs: Record<string, number>[] | null;
  } | null;
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
  usage?: {
    completion_tokens: number;
  };
}

export interface MessageStop {
  type: "message_stop";
}

export interface MessageError {
  type: "error";
  error: {
    type: string;
    message: string;
  };
}

export type StreamingMessage =
  | MessageStart
  | ContentBlockStart
  | ContentBlockDelta
  | ContentBlockStop
  | MessageDelta
  | MessageStop
  | MessageError;

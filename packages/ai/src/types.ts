export type ChatParticipantRole = "system" | "user" | "assistant" | "tool";
import { z } from "zod";

export type ChatParticipantRole = "system" | "user" | "assistant" | "tool";

export type Prompt =
  | { name: string; custom?: EdgeDBRagMessage }
  | { id: string; custom?: EdgeDBRagMessage[] }
  | { custom: EdgeDBRagMessage[] };

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

export type EdgeDBRagMessage =
  | EdgeDBSystemMessage
  | EdgeDBUserMessage
  | EdgeDBAssistantMessage
  | EdgeDBToolMessage;

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

export type StreamingMessage = z.infer<typeof _edgedbRagChunkSchema>;

const _edgedbRagChunkSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("message_start"),
    message: z.object({
      id: z.string(),
      model: z.string(),
      role: z.enum(["assistant", "system", "user"]),
      usage: z
        .object({
          prompt_tokens: z.number(),
          completion_tokens: z.number(),
        })
        .nullish(),
    }),
  }),
  z.object({
    type: z.literal("content_block_start"),
    index: z.number(),
    content_block: z.discriminatedUnion("type", [
      z.object({
        type: z.literal("text"),
        text: z.string(),
      }),
      z.object({
        type: z.literal("tool_use"),
        id: z.string().nullish(),
        name: z.string(),
        args: z.string().nullish(),
      }),
    ]),
  }),
  z.object({
    type: z.literal("content_block_delta"),
    index: z.number(),
    delta: z.discriminatedUnion("type", [
      z.object({
        type: z.literal("text_delta"),
        text: z.string(),
      }),
      z.object({
        type: z.literal("tool_call_delta"),
        args: z.string(), // partial json
      }),
    ]),
    logprobs: z
      .object({
        tokens: z.array(z.string()),
        token_logprobs: z.array(z.number()),
        top_logprobs: z.array(z.record(z.string(), z.number())).nullable(),
      })
      .nullish(),
  }),
  z.object({
    type: z.literal("content_block_stop"),
    index: z.number(),
  }),
  z.object({
    type: z.literal("message_delta"),
    delta: z.object({ stop_reason: z.string() }),
    usage: z.object({ completion_tokens: z.number() }).nullish(),
  }),
  z.object({
    type: z.literal("message_stop"),
  }),
  z.object({
    type: z.literal("error"),
    error: z.object({
      type: z.string(),
      message: z.string(),
    }),
  }),
]);
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
  delta: {
    type: "text_delta";
    text: string;
  };
  index: number;
}

export interface ContentBlockStop {
  type: "content_block_stop";
  index: number;
}

export interface MessageDelta {
  type: "message_delta";
  delta: {
    stop_reason: "stop";
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

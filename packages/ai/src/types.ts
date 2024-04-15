export type ChatParticipantRole = "system" | "user" | "assistant" | "tool";

export interface EdgeDBAIOptions {
  model: string;
  prompt: ({ name: string } | { id: string } | never) & {
    custom?: {
      role: ChatParticipantRole;
      content: string;
    }[];
  };
}

export interface QueryContext {
  query: string;
  variables?: Record<string, any>;
  globals?: Record<string, any>;
  max_object_count?: number;
}

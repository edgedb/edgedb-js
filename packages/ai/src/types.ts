export type ChatParticipantRole = "system" | "user" | "assistant" | "tool";

export interface RAGRequest<
  TextGenModel extends string = string,
  ChatPromptName extends string = string
> {
  context: RAGRequestContext;
  model: TextGenModel;
  query: string;
  prompt?: ({ name: ChatPromptName } | { id: string } | never) & {
    custom?: {
      role: ChatParticipantRole;
      content: string;
    }[];
  };
}

export interface RAGRequestContext {
  query: string;
  variables?: Record<string, any>;
  globals?: Record<string, any>;
  max_object_count?: number;
}

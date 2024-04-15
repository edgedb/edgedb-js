import * as edgedb from "edgedb";
import { createAI as _createAI, EdgeDBAI } from "./dist/index";
  
type TextGenModels = "gpt-3.5-turbo" | "gpt-4-turbo-preview" | "mistral-small-latest" | "mistral-medium-latest" | "mistral-large-latest" | "claude-3-haiku-20240307" | "claude-3-sonnet-20240229" | "claude-3-opus-20240229";
type ChatPromptNames = "builtin:rag-default";

export const createAI = _createAI as (client: edgedb.Client) => EdgeDBAI<TextGenModels, ChatPromptNames>;
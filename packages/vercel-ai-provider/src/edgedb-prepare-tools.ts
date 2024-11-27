import type {
  JSONSchema7,
  LanguageModelV1,
  LanguageModelV1CallWarning,
} from "@ai-sdk/provider";
import {
  type EdgeDBChatModelId,
  isAnthropicModel,
  isOpenAIModel,
} from "./edgedb-chat-settings";

interface OpenAILikeTool {
  type: "function";
  function: {
    name: string;
    description: string | undefined;
    parameters: unknown;
  };
}

interface AnthropicTool {
  name: string;
  description: string | undefined;
  input_schema: JSONSchema7;
}

export function prepareTools(
  mode: Parameters<LanguageModelV1["doGenerate"]>[0]["mode"] & {
    type: "regular";
  },
  model: EdgeDBChatModelId,
) {
  const isOpenAI = isOpenAIModel(model);
  const isAnthropic = isAnthropicModel(model);

  // when the tools array is empty, change it to undefined to prevent errors:
  const tools = mode.tools?.length ? mode.tools : undefined;
  const toolWarnings: LanguageModelV1CallWarning[] = [];

  if (tools == null) {
    return { toolWarnings };
  }

  const edgedbOpenAILikeTools: OpenAILikeTool[] = [];
  const edgedbAnthropicTools: AnthropicTool[] = [];

  for (const tool of tools) {
    switch (tool.type) {
      case "function":
        if (isAnthropic) {
          edgedbAnthropicTools.push({
            name: tool.name,
            description: tool.description,
            input_schema: tool.parameters,
          });
        } else {
          edgedbOpenAILikeTools.push({
            type: "function",
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters,
              // openai
              // strict: structuredOutputs === true ? true : undefined,
            },
          });
        }
        break;
      // add support for anthropic provider tools
      case "provider-defined":
        toolWarnings.push({ type: "unsupported-tool", tool });
        break;
      default:
        toolWarnings.push({ type: "unsupported-tool", tool });
        break;
    }
  }

  const toolChoice = mode.toolChoice;
  const edgedbTools = isAnthropic
    ? edgedbAnthropicTools
    : edgedbOpenAILikeTools;

  if (toolChoice == null) {
    return {
      tools: edgedbTools,
      toolWarnings,
    };
  }

  const type = toolChoice.type;

  switch (type) {
    case "auto":
      return {
        tools: edgedbTools,
        tool_choice: isAnthropic ? { type: "auto" } : "auto",
        toolWarnings,
        // add betas to Anthropic in all cases
      };
    case "none":
      return isAnthropic
        ? { toolWarnings }
        : { tools: edgedbTools, tool_choice: type, toolWarnings };
    case "required":
      return {
        tools: edgedbTools,
        tool_choice: isAnthropic
          ? { type: "any" }
          : isOpenAI
            ? "required"
            : "any",
      };

    // mistral does not support tool mode directly,
    // so we filter the tools and force the tool choice through 'any'
    case "tool":
      return isAnthropic
        ? {
            tools: edgedbTools,
            tool_choice: {
              type: "tool",
              name: toolChoice.toolName,
              toolWarnings,
            },
          }
        : isOpenAI
          ? {
              tools: edgedbTools,
              tool_choice: {
                type: "function",
                function: {
                  name: toolChoice.toolName,
                },
              },
              toolWarnings,
            }
          : {
              tools: (edgedbTools as OpenAILikeTool[]).filter(
                (tool) => tool.function!.name === toolChoice.toolName,
              ),
              tool_choice: "any",
              toolWarnings,
            };

    default: {
      const _exhaustiveCheck: never = type;
      throw new Error(`Unsupported tool choice type: ${_exhaustiveCheck}`);
    }
  }
}

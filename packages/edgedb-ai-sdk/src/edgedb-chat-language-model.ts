import { z } from "zod";
import type {
  LanguageModelV1,
  LanguageModelV1StreamPart,
  LanguageModelV1CallWarning,
} from "@ai-sdk/provider";
import {
  type ParseResult,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  postJsonToApi,
} from "@ai-sdk/provider-utils";
import type {
  EdgeDBChatConfig,
  EdgeDBChatModelId,
  EdgeDBChatSettings,
} from "./edgedb-chat-settings";
import { edgedbFailedResponseHandler } from "./edgedb-error";

export interface EdgeDBLanguageModel extends LanguageModelV1 {
  withSettings(settings: Partial<EdgeDBChatSettings>): EdgeDBChatLanguageModel;
}

export class EdgeDBChatLanguageModel implements EdgeDBLanguageModel {
  readonly specificationVersion = "v1";
  readonly defaultObjectGenerationMode = "json";
  readonly supportsImageUrls = false;

  readonly modelId: EdgeDBChatModelId;
  readonly settings: EdgeDBChatSettings;

  private readonly config: EdgeDBChatConfig;

  constructor(
    modelId: EdgeDBChatModelId,
    settings: EdgeDBChatSettings,
    config: EdgeDBChatConfig,
  ) {
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
  }

  get provider(): string {
    return this.config.provider;
  }

  withSettings(settings: Partial<EdgeDBChatSettings>) {
    return new EdgeDBChatLanguageModel(
      this.modelId,
      { ...this.settings, ...settings },
      this.config,
    );
  }

  // do we support any of these settings?
  private getArgs({
    maxTokens,
    temperature,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty,
    stopSequences,
    responseFormat,
    seed,
  }: Parameters<LanguageModelV1["doGenerate"]>[0]) {
    const warnings: LanguageModelV1CallWarning[] = [];

    if (maxTokens != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "maxTokens",
      });
    }

    if (topP != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "topP",
      });
    }

    if (topK != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "topK",
      });
    }

    if (frequencyPenalty != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "frequencyPenalty",
      });
    }

    if (presencePenalty != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "presencePenalty",
      });
    }

    if (stopSequences != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "stopSequences",
      });
    }

    if (
      responseFormat != null &&
      responseFormat.type === "json" &&
      responseFormat.schema != null
    ) {
      warnings.push({
        type: "unsupported-setting",
        setting: "responseFormat",
        details: "JSON response format schema is not supported",
      });
    }

    if (seed != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "seed",
      });
    }

    const baseArgs = {
      model: this.modelId,

      // do we support this?
      safe_prompt: false,

      // check this
      messages: [],

      temperature,
    };

    return { args: { ...baseArgs }, warnings };
  }

  async doGenerate(
    options: Parameters<LanguageModelV1["doGenerate"]>[0],
  ): Promise<any> {
    const { args, warnings } = this.getArgs(options);

    const { responseHeaders, value: response } = await postJsonToApi({
      url: `rag`,
      body: {
        model: this.modelId,
        context: this.settings.context,
        prompt: this.settings.prompt,
        query:
          options.prompt[0].role === "user" &&
          "text" in options.prompt[0].content[0] &&
          options.prompt[0].content[0].text,

        stream: false,
      },
      failedResponseHandler: edgedbFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        edgedbChatResponseSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const { messages: rawPrompt, ...rawSettings } = args;

    return {
      text: response.response ?? undefined,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
      },
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders },
      warnings,
    };
  }

  async doStream(
    options: Parameters<LanguageModelV1["doStream"]>[0],
  ): Promise<any> {
    const { args, warnings } = this.getArgs(options);

    const { responseHeaders, value: response } = await postJsonToApi({
      url: `rag`,
      body: {
        model: this.modelId,
        context: this.settings.context,
        prompt: this.settings.prompt,
        query:
          options.prompt[0].role === "user" &&
          "text" in options.prompt[0].content[0] &&
          options.prompt[0].content[0].text,
        stream: true,
      },
      failedResponseHandler: edgedbFailedResponseHandler,
      successfulResponseHandler: createEventSourceResponseHandler(
        edgedbChatChunkSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const { messages: rawPrompt, ...rawSettings } = args;

    return {
      stream: response.pipeThrough(
        new TransformStream<
          ParseResult<z.infer<typeof edgedbChatChunkSchema>>,
          LanguageModelV1StreamPart
        >({
          transform(chunk, controller) {
            if (!chunk.success) {
              controller.enqueue({ type: "error", error: chunk.error });
              return;
            }

            const value = chunk.value;

            switch (value.type) {
              case "message_start":
              case "message_delta":
              case "message_stop":
              case "content_block_start":
              case "content_block_stop": {
                return;
              }

              case "content_block_delta": {
                controller.enqueue({
                  type: "text-delta",
                  textDelta: value.delta.text,
                });
                return;
              }

              case "error": {
                controller.enqueue({ type: "error", error: value.error });
                return;
              }

              default: {
                const _exhaustiveCheck: never = value;
                throw new Error(`Unsupported chunk type: ${_exhaustiveCheck}`);
              }
            }
          },
        }),
      ),
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders },
      warnings,
    };
  }
}

const edgedbChatResponseSchema = z.object({ response: z.string() });

const edgedbChatChunkSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("message_start"),
    message: z.object({
      id: z.string(),
      model: z.string(),
      role: z.enum(["assistant", "system", "user"]),
    }),
  }),
  z.object({
    type: z.literal("content_block_start"),
    index: z.number(),
    content_block: z.object({
      type: z.literal("text"),
      text: z.string(),
    }),
  }),
  z.object({
    type: z.literal("content_block_delta"),
    index: z.number(),
    delta: z.object({
      type: z.literal("text_delta"),
      text: z.string(),
    }),
  }),
  z.object({
    type: z.literal("content_block_stop"),
    index: z.number(),
  }),

  z.object({
    type: z.literal("message_delta"),
    delta: z.object({ stop_reason: z.literal("stop") }),
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

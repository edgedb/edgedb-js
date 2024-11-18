import type { Client } from "edgedb";
import {
  EventSourceParserStream,
  type ParsedEvent,
} from "eventsource-parser/stream";

import type { ResolvedConnectConfig } from "edgedb/dist/conUtils.js";
import {
  getAuthenticatedFetch,
  type AuthenticatedFetch,
} from "edgedb/dist/utils.js";
import type {
  AIOptions,
  QueryContext,
  StreamingMessage,
  RagRequest,
} from "./types.js";
import { getHTTPSCRAMAuth } from "edgedb/dist/httpScram.js";
import { cryptoUtils } from "edgedb/dist/browserCrypto.js";

export function createAI(client: Client, options: AIOptions) {
  return new EdgeDBAI(client, options);
}

const httpSCRAMAuth = getHTTPSCRAMAuth(cryptoUtils);

export class EdgeDBAI {
  /** @internal */
  private readonly authenticatedFetch: Promise<AuthenticatedFetch>;
  private readonly options: AIOptions;
  private readonly context: QueryContext;

  /** @internal */
  constructor(
    public readonly client: Client,
    options: AIOptions,
    context: Partial<QueryContext> = {},
  ) {
    this.authenticatedFetch = EdgeDBAI.getAuthenticatedFetch(client);
    this.options = options;
    this.context = {
      query: context.query ?? "",
      ...(context.variables && { variables: context.variables }),
      ...(context.globals && { globals: context.globals }),
    };
  }

  private static async getAuthenticatedFetch(client: Client) {
    const connectConfig: ResolvedConnectConfig = (
      await (client as any).pool._getNormalizedConnectConfig()
    ).connectionParams;

    return getAuthenticatedFetch(connectConfig, httpSCRAMAuth, "ext/ai/");
  }

  withConfig(options: Partial<AIOptions>) {
    return new EdgeDBAI(
      this.client,
      { ...this.options, ...options },
      this.context,
    );
  }

  withContext(context: Partial<QueryContext>) {
    return new EdgeDBAI(this.client, this.options, {
      ...this.context,
      ...context,
    });
  }

  private async fetchRag(request: RagRequest, context: QueryContext) {
    const headers = request.stream
      ? { Accept: "text/event-stream", "Content-Type": "application/json" }
      : { Accept: "application/json", "Content-Type": "application/json" };

    const { messages } = request;

    const providedPrompt =
      this.options.prompt &&
      ("name" in this.options.prompt || "id" in this.options.prompt);

    const response = await (
      await this.authenticatedFetch
    )("rag", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...request,
        context,
        model: this.options.model,
        ...((this.options.prompt || messages.length > 1) && {
          prompt: {
            ...this.options.prompt,
            ...(messages.length > 1 && {
              // if user provides prompt.custom without id/name it is his choice
              // to not include default prompt msgs, but if user provides messages
              // and doesn't provide prompt.custom, since we add messages to the
              // prompt.custom we also have to include default prompt messages
              ...(!this.options.prompt?.custom &&
                !providedPrompt && {
                  name: "builtin::rag-default",
                }),
              custom: [...(this.options.prompt?.custom || []), ...messages],
            }),
          },
        }),
        query: [...messages].reverse().find((msg) => msg.role === "user")!
          .content[0].text,
      }),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      throw new Error(bodyText);
    }

    return response;
  }

  async queryRag(request: RagRequest, context = this.context): Promise<string> {
    const res = await this.fetchRag(
      {
        ...request,
        stream: false,
      },
      context,
    );

    if (!res.headers.get("content-type")?.includes("application/json")) {
      throw new Error(
        "Expected response to have content-type: application/json",
      );
    }

    const data = await res.json();

    if (
      !data ||
      typeof data !== "object" ||
      typeof data.response !== "string"
    ) {
      throw new Error(
        "Expected response to be an object with response key of type string",
      );
    }
    return data.response;
  }

  streamRag(
    request: RagRequest,
    context = this.context,
  ): AsyncIterable<StreamingMessage> & PromiseLike<Response> {
    const fetchRag = this.fetchRag.bind(this);

    return {
      async *[Symbol.asyncIterator]() {
        const res = await fetchRag(
          {
            ...request,
            stream: true,
          },
          context,
        );

        if (!res.body) {
          throw new Error("Expected response to include a body");
        }

        const reader = res.body
          .pipeThrough(new TextDecoderStream())
          .pipeThrough(new EventSourceParserStream())
          .getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const message = extractMessageFromParsedEvent(value);
            yield message;
            if (message.type === "message_stop") break;
          }
        } finally {
          reader.releaseLock();
        }
      },
      then<TResult1 = Response, TResult2 = never>(
        onfulfilled?:
          | ((value: Response) => TResult1 | PromiseLike<TResult1>)
          | undefined
          | null,
        onrejected?:
          | ((reason: any) => TResult2 | PromiseLike<TResult2>)
          | undefined
          | null,
      ): Promise<TResult1 | TResult2> {
        return fetchRag(
          {
            ...request,
            stream: true,
          },
          context,
        ).then(onfulfilled, onrejected);
      },
    };
  }

  async generateEmbeddings(inputs: string[], model: string): Promise<number[]> {
    const response = await (
      await this.authenticatedFetch
    )("embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: inputs,
      }),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      throw new Error(bodyText);
    }

    const data: { data: { embedding: number[] }[] } = await response.json();
    return data.data[0].embedding;
  }
}

function extractMessageFromParsedEvent(
  parsedEvent: ParsedEvent,
): StreamingMessage {
  const { data } = parsedEvent;
  if (!data) {
    throw new Error("Expected SSE message to include a data payload");
  }
  return JSON.parse(data) as StreamingMessage;
}

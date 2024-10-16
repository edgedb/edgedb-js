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
  RAGRequest,
  StreamingMessage,
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

  private async fetchRag(request: Omit<RAGRequest, "model" | "prompt">) {
    const headers = request.stream
      ? { Accept: "text/event-stream", "Content-Type": "application/json" }
      : { Accept: "application/json", "Content-Type": "application/json" };

    const response = await (
      await this.authenticatedFetch
    )("rag", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...request,
        model: this.options.model,
        prompt: this.options.prompt,
      }),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      throw new Error(bodyText);
    }

    return response;
  }

  async queryRag(query: string, context = this.context): Promise<string> {
    const res = await this.fetchRag({
      context,
      query,
      stream: false,
    });

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
        "Expected response to be object with response key of type string",
      );
    }

    return data.response;
  }

  streamRag(
    query: string,
    context = this.context,
  ): AsyncIterable<StreamingMessage> & PromiseLike<Response> {
    const fetchRag = this.fetchRag.bind(this);

    const ragOptions = {
      context,
      query,
      stream: true,
    };

    return {
      async *[Symbol.asyncIterator]() {
        const res = await fetchRag(ragOptions);

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
        return fetchRag(ragOptions).then(onfulfilled, onrejected);
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

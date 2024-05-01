import type { Client } from "edgedb";
import {
  EventSourceParserStream,
  ParsedEvent,
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

export function createAI(client: Client, options: AIOptions) {
  return new EdgeDBAI(client, options);
}

export class EdgeDBAI {
  /** @internal */
  private readonly authenticatedFetch: Promise<AuthenticatedFetch>;
  private readonly options: AIOptions;
  private readonly context: QueryContext;

  /** @internal */
  constructor(
    public readonly client: Client,
    options: AIOptions,
    context: Partial<QueryContext> = {}
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

    return getAuthenticatedFetch(connectConfig, "ext/ai/");
  }

  withConfig(options: Partial<AIOptions>) {
    return new EdgeDBAI(
      this.client,
      { ...this.options, ...options },
      this.context
    );
  }

  withContext(context: Partial<QueryContext>) {
    return new EdgeDBAI(this.client, this.options, {
      ...this.context,
      ...context,
    });
  }

  private async fetchRag(request: RAGRequest) {
    const headers = request.stream
      ? { Accept: "text/event-stream", "Content-Type": "application/json" }
      : { Accept: "application/json", "Content-Type": "application/json" };

    const response = await (
      await this.authenticatedFetch
    )("rag", {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      throw new Error(bodyText);
    }

    return response;
  }

  async queryRag(
    message: string,
    context: QueryContext = this.context
  ): Promise<string> {
    const response = await this.fetchRag({
      model: this.options.model,
      prompt: this.options.prompt,
      context,
      query: message,
      stream: false,
    });

    if (!response.headers.get("content-type")?.includes("application/json")) {
      throw new Error(
        "expected response to have content-type: application/json"
      );
    }

    const data = await response.json();
    if (
      !data ||
      typeof data !== "object" ||
      typeof data.response !== "string"
    ) {
      throw new Error(
        "expected response to be object with response key of type string"
      );
    }

    return data.response;
  }

  async *getRagAsyncGenerator(
    message: string,
    context: QueryContext = this.context
  ): AsyncGenerator<StreamingMessage, void, undefined> {
    const response = await this.fetchRag({
      model: this.options.model,
      prompt: this.options.prompt,
      context,
      query: message,
      stream: true,
    });

    if (!response.body) {
      throw new Error("Expected response to include a body");
    }

    const reader = response.body
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
  }

  async streamRag(
    message: string,
    context: QueryContext = this.context
  ): Promise<Response> {
    const response = await this.fetchRag({
      model: this.options.model,
      prompt: this.options.prompt,
      context,
      query: message,
      stream: true,
    });

    if (!response.body) {
      throw new Error("Expected response to include a body");
    }

    return new Response(response.body, {
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  async generateEmbeddings(input: string): Promise<Float32Array> {
    const authenticatedFetch = await this.authenticatedFetch;

    const response = await authenticatedFetch("embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ input, model: this.options.model }),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      throw new Error(bodyText);
    }

    const contentType = response.headers.get("content-type");
    if (contentType !== "application/json") {
      const bodyText = await response.text();
      throw new Error(
        `Expected response to have content-type: application/json, got ${contentType}\n${bodyText}`
      );
    }

    const json: unknown = await response.json();
    const maybeEmbedding = parseEmbedding(json);
    if (maybeEmbedding === null) {
      throw new Error("Expected response to include an embedding");
    }
    return maybeEmbedding;
  }
}

function extractMessageFromParsedEvent(
  parsedEvent: ParsedEvent
): StreamingMessage {
  const { data } = parsedEvent;
  if (!data) {
    throw new Error("Expected SSE message to include a data payload");
  }
  return JSON.parse(data) as StreamingMessage;
}

function parseEmbedding(json: unknown): Float32Array | null {
  if (json !== null && typeof json === "object" && "data" in json) {
    const data: unknown = json.data;
    if (data !== null && Array.isArray(data) && data.length > 0) {
      const first: unknown = data[0];
      if (
        first !== null &&
        typeof first === "object" &&
        "embedding" in first &&
        Array.isArray(first.embedding)
      ) {
        const embedding: unknown[] = first.embedding;
        if (typeof embedding[0] === "number") {
          return new Float32Array(embedding as number[]);
        }
      }
    }
  }

  return null;
}

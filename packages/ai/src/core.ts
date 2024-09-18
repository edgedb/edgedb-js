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
  Prompt,
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

  queryRag({
    query,
    context = this.context,
  }: {
    query: string;
    context?: QueryContext;
  }): QueryResponse {
    return new QueryResponse(
      this.options.model,
      this.options.prompt,
      query,
      context,
      this.authenticatedFetch,
    );
  }
}

class QueryResponse {
  constructor(
    private readonly model: string,
    private readonly prompt: Prompt | undefined,
    private readonly query: string,
    private readonly context: QueryContext,
    private readonly fetch: Promise<AuthenticatedFetch>,
  ) {}

  private async fetchRag(request: RAGRequest) {
    const headers = request.stream
      ? { Accept: "text/event-stream", "Content-Type": "application/json" }
      : { Accept: "application/json", "Content-Type": "application/json" };

    const response = await (
      await this.fetch
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

  async text(): Promise<string> {
    const res = await this.fetchRag({
      model: this.model,
      prompt: this.prompt,
      context: this.context,
      query: this.query,
      stream: false,
    });

    const data = await res.json();
    return data.response;
  }

  async stream(): Promise<any> {
    const res = await this.fetchRag({
      model: this.model,
      prompt: this.prompt,
      context: this.context,
      query: this.query,
      stream: true,
    });

    if (!res.body) {
      throw new Error("Expected response to include a body");
    }

    return new Response(res.body, {
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<
    StreamingMessage,
    void,
    undefined
  > {
    const res = await this.fetchRag({
      model: this.model,
      prompt: this.prompt,
      context: this.context,
      query: this.query,
      stream: true,
    });

    if (!res.body) {
      throw new Error("Expected response to include a body");
    }

    const reader = res
      .body!.pipeThrough(new TextDecoderStream())
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

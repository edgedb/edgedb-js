import type { Client } from "edgedb";
import type { ResolvedConnectConfig } from "edgedb/dist/conUtils.js";
import { getHTTPSCRAMAuth } from "edgedb/dist/httpScram.js";
import cryptoUtils from "edgedb/dist/adapter.crypto.node.js";
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

const httpSCRAMAuth = getHTTPSCRAMAuth(cryptoUtils.default);

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

    return getAuthenticatedFetch(connectConfig, httpSCRAMAuth, "ext/ai/");
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

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const decoded = decoder.decode(value);
        const message = extractMessageFromSSE(decoded);
        yield message;
        if (message.type === "message_stop") break;
      }
    } finally {
      reader.releaseLock();
    }
  }

  streamRag(message: string, context: QueryContext = this.context): Response {
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
}

function extractMessageFromSSE(sse: string): StreamingMessage {
  const [_, data] = sse.split(/data: /, 2);
  if (!data) {
    throw new Error("Expected SSE message to include a data payload");
  }
  return JSON.parse(data) as StreamingMessage;
}

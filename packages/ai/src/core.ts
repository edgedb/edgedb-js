import type { Client } from "edgedb";
import type { ResolvedConnectConfig } from "edgedb/dist/conUtils.js";

import type { AIOptions, QueryContext, RAGRequest } from "./types.js";

export function createAI(client: Client, options: AIOptions) {
  return new EdgeDBAI(client, options);
}

export class EdgeDBAI {
  /** @internal */
  private readonly baseUrl: Promise<string>;
  private readonly options: AIOptions;
  private readonly context: QueryContext;

  /** @internal */
  constructor(
    public readonly client: Client,
    options: AIOptions,
    context: Partial<QueryContext> = {}
  ) {
    this.baseUrl = EdgeDBAI.getBaseUrl(client);
    this.options = options;
    this.context = {
      query: context.query ?? "",
      ...(context.variables && { variables: context.variables }),
      ...(context.globals && { globals: context.globals }),
    };
  }

  private static async getBaseUrl(client: Client) {
    const connectConfig: ResolvedConnectConfig = (
      await (client as any).pool._getNormalizedConnectConfig()
    ).connectionParams;

    const [host, port] = connectConfig.address;
    const baseUrl = `${
      connectConfig.tlsSecurity === "insecure" ? "http" : "https"
    }://${host}:${port}/branch/${connectConfig.database}/ext/ai/`;

    return baseUrl;
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

    const response = await fetch(new URL("rag", await this.baseUrl), {
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
}

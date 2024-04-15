import * as edgedb from "edgedb";
import { type ResolvedConnectConfig } from "edgedb/dist/conUtils";
import { RAGRequest } from "./types";

export function createAI(client: edgedb.Client) {
  return new EdgeDBAI(client);
}

export class EdgeDBAI<
  TextGenModel extends string = string,
  ChatPromptName extends string = string
> {
  /** @internal */
  private readonly baseUrl: Promise<string>;

  /** @internal */
  constructor(public readonly client: edgedb.Client) {
    this.baseUrl = EdgeDBAI.getBaseUrl(client);
  }

  private static async getBaseUrl(client: edgedb.Client) {
    const connectConfig: ResolvedConnectConfig = (
      await (client as any).pool._getNormalizedConnectConfig()
    ).connectionParams;

    const [host, port] = connectConfig.address;
    const baseUrl = `${
      connectConfig.tlsSecurity === "insecure" ? "http" : "https"
    }://${host}:${port}/branch/${connectConfig.database}/ext/ai/`;

    return baseUrl;
  }

  async RAGQuery(
    request: RAGRequest<TextGenModel, ChatPromptName>
  ): Promise<string> {
    try {
      const response = await fetch(new URL("rag", await this.baseUrl), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(bodyText);
      }
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
    } catch (err) {
      throw err;
    }
  }
}

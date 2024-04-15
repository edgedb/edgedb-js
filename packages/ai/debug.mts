import { createClient } from "edgedb";
import { createAI } from "./ai";

const client = createClient({
  instanceName: "_localdev",
  database: "main",
  tlsSecurity: "insecure",
});
const ai = createAI(client);

console.log(
  await ai.RAGQuery({
    context: { query: "Astronomy" },
    model: "gpt-4-turbo-preview",
    query: "What color is the sky on Mars?",
  })
);

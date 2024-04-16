import { createClient } from "edgedb";
import { createAI } from "./src/index.js";

const client = createClient({
  instanceName: "_localdev",
  database: "main",
  tlsSecurity: "insecure",
});

const gpt4Ai = createAI(client, {
  model: "gpt-4-turbo-preview",
});

const astronomyAi = gpt4Ai.withContext({ query: "Astronomy" });

console.time("gpt-4 Time");
console.log(await astronomyAi.queryRag("What color is the sky on Mars?"));
console.timeEnd("gpt-4 Time");

const fastAstronomyAi = astronomyAi.withConfig({
  model: "gpt-3.5-turbo",
});

console.time("gpt-3.5 Time");
console.log(await fastAstronomyAi.queryRag("What color is the sky on Mars?"));
console.timeEnd("gpt-3.5 Time");

const fastChemistryAi = fastAstronomyAi.withContext({ query: "Chemistry" });

console.log(
  await fastChemistryAi.queryRag("What is the atomic number of gold?")
);

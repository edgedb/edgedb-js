# @edgedb/ai

## Installation

You can install the `@edgedb/ai` package using npm, yarn, or pnpm. Choose the command corresponding to your package manager:

```bash
npm install @edgedb/ai
yarn add @edgedb/ai
pnpm add @edgedb/ai
```

## EdgeDB Configuration

See the AI documentation for detailed guidance on setting up the AI extension and creating a schema for use with the specialized indexes it includes.

## API Reference

### `createAI(client: Client, options: Partial<AIOptions> = {}): EdgeDBAI`

Creates an instance of `EdgeDBAI` with the specified client and options.

- `client`: An EdgeDB client instance.
- `options`: Optional. Configuration options for the AI model.
  - `model`: Specifies the AI model to use. This could be a version of GPT or any other model supported by EdgeDB AI.
  - `prompt`: Defines the input prompt for the AI model. The prompt can be a simple string, an ID referencing a stored prompt, or a custom prompt structure that includes roles and content for more complex interactions. The default is the built-in system prompt.

### `EdgeDBAI`

#### Public Methods

- `withConfig(options: Partial<AIOptions>): EdgeDBAI`

  Returns a new `EdgeDBAI` instance with updated configuration options.

- `withContext(context: Partial<QueryContext>): EdgeDBAI`

  Returns a new `EdgeDBAI` instance with an updated query context.

- `async queryRag(message: string, context: QueryContext = this.context): Promise<string>`

  Sends a query with context to the configured AI model and returns the response as a string.

## Example

The following example demonstrates how to use the `@edgedb/ai` package to query an AI model about astronomy and chemistry.

```typescript
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
```

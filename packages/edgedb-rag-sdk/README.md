# AI SDK - EdgeDB Provider

The provider for the [Vercel AI SDK](https://sdk.vercel.ai/docs) contains language model support for
the OpenAi, Mistral and Anthropic chat and completion APIs that implements EdgeDB RAG and embedding model support for the OpenAI and Mistral embeddings API.

## Setup

The EdgeDB provider is available in the `@edgedb/ai-sdk` module. You can install it with:

```bash
npm i @edgedb/ai-sdk
```

## Provider Instance

You can import the default provider instance `edgedbRag` from `@edgedb/ai-sdk`:

```ts
import { edgedbRag } from "@edgedb/ai-sdk";
```

## Example

```ts
import { generateText } from "ai";
import { createClient } from "edgedb";
import { edgedbRag } from "@edgedb/ai-sdk";

const textModel = (await edgedbRag).languageModel("gpt-4-turbo-preview");

const { text } = await generateText({
  model: textModel.withSettings({
    context: { query: "your context" },
  }),
  prompt: "your prompt",
});

console.log(text);
```

## Documentation

Please check out the **[EdgeDB provider documentation](https://docs.edgedb.com)** for more information.

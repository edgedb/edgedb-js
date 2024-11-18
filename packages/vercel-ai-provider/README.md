# Provider for the Vercel AI SDK

The provider for the [Vercel AI SDK](https://sdk.vercel.ai/docs) contains language model support for
the OpenAi, Mistral and Anthropic chat and completion APIs that implements EdgeDB RAG, and embedding model support for the OpenAI and Mistral embeddings API.

## Setup

Provider is available in the `@edgedb/vercel-ai-provider` module. You can install it with:

```bash
npm i @edgedb/vercel-ai-provider
```

## Provider Instance

You can import the default provider instance `edgedb` from `@edgedb/vercel-ai-provider`:

```ts
import { edgedb } from "@edgedb/vercel-ai-provider";
```

## Example

```ts
import { generateText } from "ai";
import { createClient } from "edgedb";
import { edgedb } from "@edgedb/vercel-ai-provider";

const textModel = (await edgedb).languageModel("gpt-4-turbo-preview");

const { text } = await generateText({
  model: textModel.withSettings({
    context: { query: "your context" },
  }),
  prompt: "your prompt",
});

console.log(text);
```

## Documentation

Please check out the **[EdgeDB provider documentation](https://docs.edgedb.com/ai/vercel-ai-provider)** for more information.

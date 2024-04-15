import fs from "node:fs/promises";
import { createClient } from "edgedb";

const client = createClient("_localdev"); // TODO: replace with cli args

(async function () {
  const { textGenModels, chatPrompts } = await client.queryRequiredSingle<{
    textGenModels: {
      name: string;
      annotations: { name: string; "@value": string }[];
    }[];
    chatPrompts: { name: string }[];
  }>(`
  select {
    textGenModels := (
      select schema::ObjectType {
        name,
        annotations: {
          name,
          @value
        }
      } filter .ancestors.name = 'ext::ai::TextGenerationModel'
  ),
  chatPrompts := (
    select ext::ai::ChatPrompt {
      name
    }
  )
}`);

  await fs.writeFile(
    "./ai.ts",
    `import * as edgedb from "edgedb";
import { createAI as _createAI, EdgeDBAI } from "./dist/index";
  
type TextGenModels = ${textGenModels
      .map(
        (model) =>
          model.annotations.find((ann) => ann.name === "ext::ai::model_name")?.[
            "@value"
          ]
      )
      .filter((val) => val != null)
      .map((val) => JSON.stringify(val))
      .join(" | ")};
type ChatPromptNames = ${chatPrompts
      .map((val) => JSON.stringify(val.name))
      .join(" | ")};

export const createAI = _createAI as (client: edgedb.Client) => EdgeDBAI<TextGenModels, ChatPromptNames>;`
  );
})();

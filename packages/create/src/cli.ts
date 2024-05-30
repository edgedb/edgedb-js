#!/usr/bin/env node

import * as p from "@clack/prompts";
import pc from "picocolors";

import { baseRecipe, recipes as _recipes } from "./recipes/index.js";

async function main() {
  p.intro("Welcome to the EdgeDB Create CLI 🚀");

  const baseOptions = await baseRecipe.getOptions();
  const recipeOptions: any[] = [];

  const recipes = _recipes.filter(
    (recipe) => !(recipe.skip?.(baseOptions) ?? false),
  );

  for (const recipe of recipes) {
    recipeOptions.push(await recipe.getOptions?.(baseOptions));
  }

  await baseRecipe.apply(baseOptions);
  for (let i = 0; i < recipes.length; i++) {
    await recipes[i].apply(baseOptions, recipeOptions[i]);
  }

  p.outro(`\
Your EdgeDB project has been initialized! 🚀

Enter your project directory using: ${pc.green(
    `cd ${baseOptions.projectName}`,
  )} 
Follow the instructions in the ${pc.green("README.md")} file to get started.

Need help? Join our community at ${pc.green("https://edgedb.com/community")}`);
}

await main();

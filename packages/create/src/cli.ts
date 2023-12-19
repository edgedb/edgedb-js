#!/usr/bin/env node

import { baseRecipe, recipes as _recipes } from "./recipes/index.js";

async function main() {
  const baseOptions = await baseRecipe.getOptions();
  const recipeOptions: any[] = [];

  const recipes = _recipes.filter(
    (recipe) => !(recipe.skip?.(baseOptions) ?? false)
  );

  for (const recipe of recipes) {
    recipeOptions.push(await recipe.getOptions?.(baseOptions));
  }

  await baseRecipe.apply(baseOptions);
  for (let i = 0; i < recipes.length; i++) {
    await recipes[i].apply(baseOptions, recipeOptions[i]);
  }
}

await main();

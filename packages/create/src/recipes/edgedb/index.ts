import debug from "debug";

import { type RecipeOptions } from "../types.js";

const logger = debug("@edgedb/create:recipe:edgedb");

export default async function edgeDBRecipe(options: RecipeOptions) {
  logger("Running edgedb recipe")
}

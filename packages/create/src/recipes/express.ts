import debug from "debug";
import type { RecipeOptions } from "./types.js";

const logger = debug("@edgedb/create:recipe:express");

export default async function ExpressRecipe(options: RecipeOptions) {
  if (options.framework !== "express") return;
  logger("Running express recipe")
}

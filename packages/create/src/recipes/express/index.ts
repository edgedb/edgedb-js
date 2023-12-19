import debug from "debug";
import type { Recipe } from "../types.js";

const logger = debug("@edgedb/create:recipe:express");

const recipe: Recipe = {
  skip(opts) {
    return opts.framework !== "express";
  },
  async apply(baseOptions, recipeOptions) {
    logger("Running express recipe");
  },
};

export default recipe;

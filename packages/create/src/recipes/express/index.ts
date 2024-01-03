import debug from "debug";
import type { BaseOptions, Recipe } from "../types.js";

const logger = debug("@edgedb/create:recipe:express");

const recipe: Recipe = {
  skip(opts: BaseOptions) {
    return opts.framework !== "express";
  },
  async apply(baseOptions: BaseOptions) {
    logger("Running express recipe");
  },
};

export default recipe;

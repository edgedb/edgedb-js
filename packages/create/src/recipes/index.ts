import baseRecipe from "./_base/index.js";
import _edgedbInit from "./_edgedb/index.js";
import _install from "./_install/index.js";

import express from "./express/index.js";

import { Recipe } from "./types.js";

export { baseRecipe };

export const recipes: Recipe[] = [
  // frameworks
  express,
  // init
  _edgedbInit,
  _install,
];

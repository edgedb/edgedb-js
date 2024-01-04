import baseRecipe from "./_base/index.js";
import _edgedbInit from "./_edgedb/index.js";
import _install from "./_install/index.js";

import express from "./express/index.js";
import nextjs from "./nextjs/index.js";
import remix from "./remix/index.js";

import { type Recipe } from "./types.js";

export { baseRecipe };

export const recipes: Recipe<any>[] = [
  // frameworks
  express,
  nextjs,
  remix,
  // init
  _edgedbInit,
  _install,
];

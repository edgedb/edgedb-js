import { default as express } from "./express/index.js";
import { default as base } from "./base/index.js";
export type { Recipe } from "./types.js";

export const recipes = [
  // n.b. base must come first since it is responsible for creating the project
  // structure that other recipes depend on
  base,
  express,
];

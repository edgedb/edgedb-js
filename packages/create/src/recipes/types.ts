import { type PackageManager } from "../utils.js";

export type Framework =
  | "next"
  | "remix"
  | "express"
  | "sveltekit"
  | "node-http"
  | "nuxt"
  | "none";

export interface BaseOptions {
  packageManager: PackageManager;
  projectName: string;
  framework: Framework;
  projectDir: string;
  useEdgeDBAuth: boolean;
}

export interface Recipe<RecipeOptions = undefined> {
  skip?: (baseOptions: BaseOptions) => boolean;
  getOptions?: (baseOptions: BaseOptions) => Promise<RecipeOptions>;
  apply: (
    baseOptions: BaseOptions,
    recipeOptions: RecipeOptions
  ) => Promise<void>;
}

export interface BaseRecipe {
  getOptions: () => Promise<BaseOptions>;
  apply: (baseOptions: BaseOptions) => Promise<void>;
}

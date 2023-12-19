import { type PackageManager } from "../utils.js";

export type Framework = "next" | "remix" | "express" | "node-http" | "none";

export interface BaseOptions {
  packageManager: PackageManager;
  projectName: string;
  framework: Framework;
  projectDir: string;
  useEdgeDBAuth: boolean;
}

export interface Recipe<RecipeOptions = any> {
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

export type Framework = "next" | "remix" | "express" | "node-http" | "none";

export type RecipeOptions = {
  projectName: string;
  projectDir: string;
  framework: Framework;
  useEdgeDBAuth: boolean;
  shouldGitInit: boolean;
  shouldInstall: boolean;
};

export type Recipe = (options: RecipeOptions) => Promise<void>;

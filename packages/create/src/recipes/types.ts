export type RecipeOptions = {
  projectName: string;
  framework: string;
  useEdgeDBAuth: boolean;
  shouldGitInit: boolean;
  shouldInstall: boolean;
}

export type Recipe = (options: RecipeOptions) => Promise<void>;

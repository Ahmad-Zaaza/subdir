import type { RepoProvider } from "../types.js";
import { github } from "./github.js";
import { gitlab } from "./gitlab.js";

export const providers: RepoProvider[] = [github, gitlab];

export function detectProvider(url: string): RepoProvider {
  const provider = providers.find((p) => p.canHandle(url));
  if (!provider) {
    throw new Error(
      `Unsupported URL. Supported: GitHub (github.com), GitLab (gitlab.com)`
    );
  }
  return provider;
}

export { github, gitlab };
export { downloadGitHubFile } from "./github.js";
export { downloadGitLabFile } from "./gitlab.js";

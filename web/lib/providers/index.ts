import { github } from "./github";
import { gitlab } from "./gitlab";
import { bitbucket } from "./bitbucket";
import type { RepoProvider } from "../types";

export const providers: RepoProvider[] = [github, gitlab, bitbucket];

export function detectProvider(url: string): RepoProvider | null {
  for (const provider of providers) {
    if (provider.canHandle(url)) {
      return provider;
    }
  }
  return null;
}

export function getProviderName(url: string): string | null {
  const provider = detectProvider(url);
  return provider?.name ?? null;
}

import type { RepoProvider, FileEntry, FetchConfig, ParsedUrl } from "../types";
import {
  createNotFoundError,
  createAuthRequiredError,
  createNetworkError,
  createFileTooLargeError,
  createProviderError,
  createRateLimitError,
} from "../errors";

const BITBUCKET_API = "https://api.bitbucket.org/2.0";
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function getHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    "User-Agent": "subdir-web",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export const bitbucket: RepoProvider = {
  name: "bitbucket",

  canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname === "bitbucket.org";
    } catch {
      return false;
    }
  },

  parseUrl(url: string): ParsedUrl {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);

    if (parts.length < 2) {
      throw new Error("Invalid Bitbucket URL: missing workspace/repo");
    }

    const [workspace, repo] = parts;
    let branch = "main";
    let path = "";

    // Format: /workspace/repo/src/branch/path or /workspace/repo/src/commit-hash/path
    if (parts.length > 3 && parts[2] === "src") {
      branch = parts[3];
      path = parts.slice(4).join("/");
    }

    return { owner: workspace, repo, branch, path };
  },

  async fetchContents(config: FetchConfig): Promise<FileEntry[]> {
    const { owner, repo, branch, path, token, signal } = config;
    const encodedPath = path ? `/${encodeURIComponent(path)}` : "";
    const url = `${BITBUCKET_API}/repositories/${owner}/${repo}/src/${branch}${encodedPath}?pagelen=100`;

    let response: Response;
    try {
      response = await fetch(url, { headers: getHeaders(token), signal });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") throw e;
      throw createNetworkError();
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw createNotFoundError();
      }
      if (response.status === 401) {
        throw createAuthRequiredError();
      }
      if (response.status === 429) {
        throw createRateLimitError("Bitbucket");
      }
      throw createProviderError(`Bitbucket API error: ${response.status}`);
    }

    const data = await response.json();
    const items = data.values || [];

    return items.map(
      (item: { path: string; type: string; size?: number; commit?: { hash: string } }) => ({
        name: item.path.split("/").pop() || item.path,
        path: item.path,
        type: item.type === "commit_directory" ? "dir" : "file",
        size: item.size || 0,
        sha: item.commit?.hash,
      })
    );
  },

  async downloadFile(file: FileEntry, config: FetchConfig): Promise<Uint8Array> {
    const { owner, repo, branch, token, signal } = config;

    if (file.size > MAX_FILE_SIZE) {
      throw createFileTooLargeError(file.name);
    }

    const encodedPath = encodeURIComponent(file.path);
    const url = `${BITBUCKET_API}/repositories/${owner}/${repo}/src/${branch}/${encodedPath}`;

    let response: Response;
    try {
      response = await fetch(url, { headers: getHeaders(token), signal });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") throw e;
      throw createNetworkError();
    }

    if (!response.ok) {
      throw createProviderError(`Failed to download file: ${response.status}`);
    }

    return new Uint8Array(await response.arrayBuffer());
  },
};

import type { RepoProvider, FileEntry, FetchConfig, ParsedUrl } from "../types";
import {
  createRateLimitError,
  createNotFoundError,
  createAuthRequiredError,
  createInvalidTokenError,
  createNetworkError,
  createFileTooLargeError,
  createProviderError,
} from "../errors";

const GITHUB_API = "https://api.github.com";
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function getHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "subdir-web",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export const github: RepoProvider = {
  name: "github",

  canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname === "github.com";
    } catch {
      return false;
    }
  },

  parseUrl(url: string): ParsedUrl {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);

    if (parts.length < 2) {
      throw new Error("Invalid GitHub URL: missing owner/repo");
    }

    const [owner, repo] = parts;
    let branch = "main";
    let path = "";

    // Format: /owner/repo/tree/branch/path or /owner/repo/blob/branch/path
    if (parts.length > 3 && (parts[2] === "tree" || parts[2] === "blob")) {
      branch = parts[3];
      path = parts.slice(4).join("/");
    }

    return { owner, repo, branch, path };
  },

  async fetchContents(config: FetchConfig): Promise<FileEntry[]> {
    const { owner, repo, branch, path, token, signal } = config;
    const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;

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
      if (response.status === 403) {
        const remaining = response.headers.get("X-RateLimit-Remaining");
        if (remaining === "0") {
          throw createRateLimitError("GitHub");
        }
        throw createInvalidTokenError();
      }
      if (response.status === 401) {
        throw createAuthRequiredError();
      }
      throw createProviderError(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    const items = Array.isArray(data) ? data : [data];

    return items.map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type === "dir" ? "dir" : "file",
      size: item.size || 0,
      downloadUrl: item.download_url,
      sha: item.sha,
    }));
  },

  async downloadFile(file: FileEntry, config: FetchConfig): Promise<Uint8Array> {
    const { owner, repo, branch, token, signal } = config;

    if (file.size > MAX_FILE_SIZE) {
      throw createFileTooLargeError(file.name);
    }

    // For large files (>1MB), use the blob API
    if (file.size > 1024 * 1024 && file.sha) {
      const blobUrl = `${GITHUB_API}/repos/${owner}/${repo}/git/blobs/${file.sha}`;
      let response: Response;
      try {
        response = await fetch(blobUrl, { headers: getHeaders(token), signal });
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") throw e;
        throw createNetworkError();
      }

      if (!response.ok) {
        throw createProviderError(`Failed to download blob: ${response.status}`);
      }

      const blob = await response.json();
      const binaryString = atob(blob.content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }

    // For smaller files, use the download URL
    const rawUrl =
      file.downloadUrl ||
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`;

    const headers: HeadersInit = { "User-Agent": "subdir-web" };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(rawUrl, { headers, signal });
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

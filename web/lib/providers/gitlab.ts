import type { RepoProvider, FileEntry, FetchConfig, ParsedUrl } from "../types";
import {
  createNotFoundError,
  createAuthRequiredError,
  createNetworkError,
  createFileTooLargeError,
  createProviderError,
} from "../errors";

const GITLAB_API = "https://gitlab.com/api/v4";
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function getHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    "User-Agent": "subdir-web",
  };
  if (token) {
    headers["PRIVATE-TOKEN"] = token;
  }
  return headers;
}

function encodeProjectId(owner: string, repo: string): string {
  return encodeURIComponent(`${owner}/${repo}`);
}

export const gitlab: RepoProvider = {
  name: "gitlab",

  canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname === "gitlab.com";
    } catch {
      return false;
    }
  },

  parseUrl(url: string): ParsedUrl {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);

    if (parts.length < 2) {
      throw new Error("Invalid GitLab URL: missing owner/repo");
    }

    // GitLab supports subgroups, so the repo might be at various positions
    // Format: /group/[subgroups]/project/-/tree/branch/path
    const treeIndex = parts.indexOf("-");
    let owner: string;
    let repo: string;
    let branch = "main";
    let path = "";

    if (treeIndex === -1) {
      // No tree/blob indicator, just owner/repo
      // Could be a subgroup project: /group/subgroup/project
      repo = parts[parts.length - 1];
      owner = parts.slice(0, -1).join("/");
    } else {
      // Has tree/blob indicator
      repo = parts[treeIndex - 1];
      owner = parts.slice(0, treeIndex - 1).join("/");

      if (parts[treeIndex + 1] === "tree" || parts[treeIndex + 1] === "blob") {
        branch = parts[treeIndex + 2] || "main";
        path = parts.slice(treeIndex + 3).join("/");
      }
    }

    return { owner, repo, branch, path };
  },

  async fetchContents(config: FetchConfig): Promise<FileEntry[]> {
    const { owner, repo, branch, path, token, signal } = config;
    const projectId = encodeProjectId(owner, repo);
    const encodedPath = path ? `&path=${encodeURIComponent(path)}` : "";
    const url = `${GITLAB_API}/projects/${projectId}/repository/tree?ref=${branch}${encodedPath}&per_page=100`;

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
      throw createProviderError(`GitLab API error: ${response.status}`);
    }

    const data = await response.json();

    return data.map((item: { name: string; path: string; type: string; id: string }) => ({
      name: item.name,
      path: item.path,
      type: item.type === "tree" ? "dir" : "file",
      size: 0, // GitLab tree API doesn't return size
      id: item.id,
    }));
  },

  async downloadFile(file: FileEntry, config: FetchConfig): Promise<Uint8Array> {
    const { owner, repo, branch, token, signal } = config;

    if (file.size > MAX_FILE_SIZE) {
      throw createFileTooLargeError(file.name);
    }

    const projectId = encodeProjectId(owner, repo);
    const encodedPath = encodeURIComponent(file.path);
    const url = `${GITLAB_API}/projects/${projectId}/repository/files/${encodedPath}/raw?ref=${branch}`;

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

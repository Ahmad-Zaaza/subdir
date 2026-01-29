import type {
  RepoProvider,
  ParsedUrl,
  FetchConfig,
  FileEntry,
  GitLabTreeItem,
} from "../types.js";

const API_BASE = "https://gitlab.com/api/v4";

function getHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": "ghdir-cli",
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
    return /^https?:\/\/gitlab\.com\//.test(url);
  },

  parseUrl(url: string): ParsedUrl {
    // GitLab URLs: https://gitlab.com/owner/repo/-/tree/branch/path
    // Or with subgroups: https://gitlab.com/group/subgroup/repo/-/tree/branch/path
    const regex =
      /^https?:\/\/gitlab\.com\/(.+?)\/-\/(?:tree|blob)\/([^/]+)(?:\/(.*))?$/;
    const match = url.match(regex);

    if (!match) {
      throw new Error(
        `Invalid GitLab URL. Expected: https://gitlab.com/owner/repo/-/tree/branch/path`
      );
    }

    const [, projectPath, branch, path = ""] = match;
    // Split project path into owner (everything before last /) and repo (last segment)
    const parts = projectPath.split("/");
    const repo = parts.pop()!;
    const owner = parts.join("/");

    return {
      owner,
      repo,
      branch,
      path: path.replace(/\/$/, ""),
    };
  },

  async fetchContents(config: FetchConfig): Promise<FileEntry[]> {
    const { owner, repo, branch, path, token } = config;
    const projectId = encodeProjectId(owner, repo);
    const encodedPath = encodeURIComponent(path);

    // GitLab tree API with pagination
    let allItems: GitLabTreeItem[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const url = `${API_BASE}/projects/${projectId}/repository/tree?path=${encodedPath}&ref=${branch}&per_page=${perPage}&page=${page}`;
      const res = await fetch(url, { headers: getHeaders(token) });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(`Path not found: ${path}`);
        }
        if (res.status === 401) {
          throw new Error(
            "GitLab authentication failed. Use --token for private repos."
          );
        }
        throw new Error(`GitLab API error: ${res.status} ${res.statusText}`);
      }

      const items = (await res.json()) as GitLabTreeItem[];
      allItems = allItems.concat(items);

      if (items.length < perPage) break;
      page++;
    }

    return allItems.map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type === "tree" ? "dir" : "file",
      size: 0, // GitLab tree API doesn't return size
      id: item.id,
    }));
  },

  async downloadFile(file: FileEntry, token?: string): Promise<Buffer> {
    // This needs owner/repo from config - will be called via downloadGitLabFile
    throw new Error("Use downloadGitLabFile with config");
  },
};

export async function downloadGitLabFile(
  file: FileEntry,
  config: FetchConfig
): Promise<Buffer> {
  const { owner, repo, branch, token } = config;
  const projectId = encodeProjectId(owner, repo);
  const encodedPath = encodeURIComponent(file.path);

  const url = `${API_BASE}/projects/${projectId}/repository/files/${encodedPath}/raw?ref=${branch}`;
  const res = await fetch(url, { headers: getHeaders(token) });

  if (!res.ok) {
    throw new Error(
      `Failed to download file ${file.path}: ${res.status} ${res.statusText}`
    );
  }

  return Buffer.from(await res.arrayBuffer());
}

import type {
  RepoProvider,
  ParsedUrl,
  FetchConfig,
  FileEntry,
  GitHubContent,
  GitHubBlob,
} from "../types.js";

const API_BASE = "https://api.github.com";
const LARGE_FILE_THRESHOLD = 1024 * 1024;

function getHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "ghdir-cli",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchContentsApi(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  token?: string
): Promise<GitHubContent[]> {
  const url = `${API_BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  const res = await fetch(url, { headers: getHeaders(token) });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Path not found: ${path}`);
    }
    if (res.status === 403) {
      const remaining = res.headers.get("x-ratelimit-remaining");
      if (remaining === "0") {
        throw new Error(
          "GitHub API rate limit exceeded. Use --token for higher limits."
        );
      }
      throw new Error("Access forbidden. Check your token permissions.");
    }
    if (res.status === 401) {
      throw new Error("Invalid GitHub token.");
    }
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    return [data as GitHubContent];
  }
  return data as GitHubContent[];
}

async function fetchBlob(
  owner: string,
  repo: string,
  sha: string,
  token?: string
): Promise<Buffer> {
  const url = `${API_BASE}/repos/${owner}/${repo}/git/blobs/${sha}`;
  const res = await fetch(url, { headers: getHeaders(token) });

  if (!res.ok) {
    throw new Error(`Failed to fetch blob: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as GitHubBlob;
  return Buffer.from(data.content, "base64");
}

async function downloadRaw(
  downloadUrl: string,
  token?: string
): Promise<Buffer> {
  const res = await fetch(downloadUrl, { headers: getHeaders(token) });

  if (!res.ok) {
    throw new Error(`Failed to download file: ${res.status} ${res.statusText}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

export const github: RepoProvider = {
  name: "github",

  canHandle(url: string): boolean {
    return /^https?:\/\/github\.com\//.test(url);
  },

  parseUrl(url: string): ParsedUrl {
    const regex =
      /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:tree|blob)\/([^/]+)\/(.+)$/;
    const match = url.match(regex);

    if (!match) {
      throw new Error(
        `Invalid GitHub URL. Expected: https://github.com/owner/repo/tree/branch/path`
      );
    }

    const [, owner, repo, branch, path] = match;
    return {
      owner,
      repo,
      branch,
      path: path.replace(/\/$/, ""),
    };
  },

  async fetchContents(config: FetchConfig): Promise<FileEntry[]> {
    const { owner, repo, branch, path, token } = config;
    const contents = await fetchContentsApi(owner, repo, path, branch, token);

    return contents
      .filter((item) => item.type === "file" || item.type === "dir")
      .map((item) => ({
        name: item.name,
        path: item.path,
        type: item.type as "file" | "dir",
        size: item.size,
        downloadUrl: item.download_url ?? undefined,
        sha: item.sha,
      }));
  },

  async downloadFile(file: FileEntry, token?: string): Promise<Buffer> {
    // For large files or missing download_url, need blob API which requires owner/repo
    if (file.size > LARGE_FILE_THRESHOLD || !file.downloadUrl) {
      throw new Error("Use downloadGitHubFile with config for this file");
    }
    return downloadRaw(file.downloadUrl, token);
  },
};

// Extended download function that has access to full config
export async function downloadGitHubFile(
  file: FileEntry,
  config: FetchConfig
): Promise<Buffer> {
  const { owner, repo, token } = config;

  if (file.size > LARGE_FILE_THRESHOLD || !file.downloadUrl) {
    if (!file.sha) {
      throw new Error(`Cannot download file without sha: ${file.path}`);
    }
    return fetchBlob(owner, repo, file.sha, token);
  }

  return downloadRaw(file.downloadUrl, token);
}

// Re-export for backwards compat
export { fetchContentsApi as fetchContents, fetchBlob, downloadRaw as downloadFile };

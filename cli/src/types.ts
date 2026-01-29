// Provider-agnostic types
export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
  downloadUrl?: string;
  sha?: string; // GitHub
  id?: string; // GitLab
}

export interface ParsedUrl {
  owner: string;
  repo: string;
  branch: string;
  path: string;
}

export interface FetchConfig {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  token?: string;
}

export interface DownloadConfig extends FetchConfig {
  outputDir: string;
}

export interface ProgressCallback {
  (current: number, total: number, filename: string): void;
}

export interface RepoProvider {
  name: string;
  canHandle(url: string): boolean;
  parseUrl(url: string): ParsedUrl;
  fetchContents(config: FetchConfig): Promise<FileEntry[]>;
  downloadFile(file: FileEntry, token?: string): Promise<Buffer>;
}

// GitHub-specific types
export interface GitHubContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: "file" | "dir" | "symlink" | "submodule";
}

export interface GitHubBlob {
  sha: string;
  node_id: string;
  size: number;
  url: string;
  content: string;
  encoding: "base64";
}

// GitLab-specific types
export interface GitLabTreeItem {
  id: string;
  name: string;
  type: "tree" | "blob";
  path: string;
  mode: string;
}

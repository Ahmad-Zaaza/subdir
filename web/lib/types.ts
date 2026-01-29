export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
  downloadUrl?: string;
  sha?: string;
  id?: string;
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
  signal?: AbortSignal;
}

export interface RepoProvider {
  name: string;
  canHandle(url: string): boolean;
  parseUrl(url: string): ParsedUrl;
  fetchContents(config: FetchConfig): Promise<FileEntry[]>;
  downloadFile(file: FileEntry, config: FetchConfig): Promise<Uint8Array>;
}

export interface DownloadRequest {
  url: string;
  token?: string;
}

export interface FileWithContent {
  relativePath: string;
  content: Uint8Array;
}

export interface DownloadProgress {
  phase: "fetching" | "downloading" | "zipping";
  current: number;
  total: number;
  currentFile?: string;
}

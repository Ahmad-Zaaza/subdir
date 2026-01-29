import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  DownloadConfig,
  FetchConfig,
  FileEntry,
  ProgressCallback,
  RepoProvider,
} from "./types.js";
import { downloadGitHubFile } from "./providers/github.js";
import { downloadGitLabFile } from "./providers/gitlab.js";

interface FileToDownload {
  file: FileEntry;
  relativePath: string;
}

async function collectFiles(
  provider: RepoProvider,
  config: FetchConfig,
  basePath: string
): Promise<FileToDownload[]> {
  const contents = await provider.fetchContents(config);
  const files: FileToDownload[] = [];

  for (const item of contents) {
    const relativePath = item.path.replace(basePath, "").replace(/^\//, "");

    if (item.type === "file") {
      files.push({ file: item, relativePath });
    } else if (item.type === "dir") {
      const subFiles = await collectFiles(
        provider,
        { ...config, path: item.path },
        basePath
      );
      files.push(...subFiles);
    }
  }

  return files;
}

async function downloadFileContent(
  provider: RepoProvider,
  file: FileEntry,
  config: FetchConfig
): Promise<Buffer> {
  if (provider.name === "github") {
    return downloadGitHubFile(file, config);
  }
  if (provider.name === "gitlab") {
    return downloadGitLabFile(file, config);
  }
  return provider.downloadFile(file, config.token);
}

export async function downloadDirectory(
  provider: RepoProvider,
  config: DownloadConfig,
  onProgress?: ProgressCallback
): Promise<void> {
  const { path, outputDir } = config;

  const files = await collectFiles(provider, config, path);

  if (files.length === 0) {
    console.log("No files found in directory.");
    return;
  }

  let current = 0;
  const total = files.length;

  for (const { file, relativePath } of files) {
    current++;
    const destPath = join(outputDir, relativePath);

    onProgress?.(current, total, relativePath);

    await mkdir(dirname(destPath), { recursive: true });

    const data = await downloadFileContent(provider, file, config);
    await writeFile(destPath, data);
  }
}

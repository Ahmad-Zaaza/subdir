import JSZip from "jszip";
import type { RepoProvider, FetchConfig, FileEntry, FileWithContent, DownloadProgress } from "./types";
import { createEmptyDirectoryError } from "./errors";

const CONCURRENT_DOWNLOADS = 6;

async function collectFilesRecursively(
  provider: RepoProvider,
  config: FetchConfig,
  basePath: string,
  onProgress: (p: DownloadProgress) => void,
  collectedFiles: FileEntry[]
): Promise<void> {
  const entries = await provider.fetchContents(config);

  for (const entry of entries) {
    if (entry.type === "file") {
      collectedFiles.push(entry);
    } else if (entry.type === "dir") {
      await collectFilesRecursively(
        provider,
        { ...config, path: entry.path },
        basePath,
        onProgress,
        collectedFiles
      );
    }
    onProgress({
      phase: "fetching",
      current: collectedFiles.length,
      total: collectedFiles.length,
    });
  }
}

export async function collectFiles(
  provider: RepoProvider,
  config: FetchConfig,
  onProgress: (p: DownloadProgress) => void
): Promise<FileWithContent[]> {
  const files: FileEntry[] = [];

  onProgress({ phase: "fetching", current: 0, total: 0 });

  await collectFilesRecursively(provider, config, config.path, onProgress, files);

  if (files.length === 0) {
    throw createEmptyDirectoryError();
  }

  const results: FileWithContent[] = [];
  let completed = 0;

  // Download files with concurrency limit
  const downloadBatch = async (batch: FileEntry[]) => {
    return Promise.all(
      batch.map(async (file) => {
        onProgress({
          phase: "downloading",
          current: completed,
          total: files.length,
          currentFile: file.name,
        });

        const content = await provider.downloadFile(file, config);
        completed++;

        // Calculate relative path from the requested directory
        const relativePath = config.path
          ? file.path.startsWith(config.path + "/")
            ? file.path.slice(config.path.length + 1)
            : file.path.startsWith(config.path)
            ? file.path.slice(config.path.length)
            : file.path
          : file.path;

        return {
          relativePath: relativePath.startsWith("/") ? relativePath.slice(1) : relativePath,
          content,
        };
      })
    );
  };

  // Process files in batches
  for (let i = 0; i < files.length; i += CONCURRENT_DOWNLOADS) {
    const batch = files.slice(i, i + CONCURRENT_DOWNLOADS);
    const batchResults = await downloadBatch(batch);
    results.push(...batchResults);
  }

  return results;
}

export async function createAndDownloadZip(
  files: FileWithContent[],
  filename: string,
  onProgress: (p: DownloadProgress) => void
): Promise<void> {
  const zip = new JSZip();

  onProgress({ phase: "zipping", current: 0, total: files.length });

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    zip.file(file.relativePath, file.content);
    onProgress({
      phase: "zipping",
      current: i + 1,
      total: files.length,
      currentFile: file.relativePath,
    });
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadDirectory(
  provider: RepoProvider,
  config: FetchConfig,
  onProgress: (p: DownloadProgress) => void
): Promise<void> {
  const files = await collectFiles(provider, config, onProgress);

  const dirName = config.path
    ? config.path.split("/").filter(Boolean).pop() || config.repo
    : config.repo;

  await createAndDownloadZip(files, `${dirName}.zip`, onProgress);
}

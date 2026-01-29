#!/usr/bin/env node
import { program } from "commander";
import { basename } from "node:path";
import { detectProvider } from "./providers/index.js";
import { downloadDirectory } from "./download.js";

program
  .name("subdir")
  .description("Download a subdirectory from git repositories (GitHub, GitLab)")
  .version("1.0.0")
  .argument("<url>", "Repository URL (GitHub or GitLab)")
  .option("-o, --output <dir>", "Output directory")
  .option("-t, --token <token>", "Access token for private repos")
  .option("-b, --branch <branch>", "Override branch/ref")
  .action(
    async (
      url: string,
      options: { output?: string; token?: string; branch?: string }
    ) => {
      try {
        const provider = detectProvider(url);
        const parsed = provider.parseUrl(url);

        if (options.branch) {
          parsed.branch = options.branch;
        }

        const outputDir = options.output || basename(parsed.path) || parsed.repo;

        console.log(`Provider: ${provider.name}`);
        console.log(`Downloading ${parsed.owner}/${parsed.repo}/${parsed.path}`);
        console.log(`Branch: ${parsed.branch}`);
        console.log(`Output: ${outputDir}\n`);

        await downloadDirectory(
          provider,
          {
            ...parsed,
            token: options.token,
            outputDir,
          },
          (current, total, filename) => {
            process.stdout.write(
              `\rDownloading ${current}/${total}: ${filename}`
            );
          }
        );

        console.log("\n\nDone!");
      } catch (err) {
        console.error(`\nError: ${err instanceof Error ? err.message : err}`);
        process.exit(1);
      }
    }
  );

program.parse();

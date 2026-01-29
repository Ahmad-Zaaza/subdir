# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev      # dev server at localhost:3000
pnpm build    # production build
pnpm lint     # eslint
```

## Architecture

**Subdir** - downloads subdirectories from GitHub/GitLab as ZIP files.

### Provider Pattern

`lib/providers/` implements `RepoProvider` interface (`lib/types.ts`):
- `canHandle(url)` - detect provider from URL
- `parseUrl(url)` - extract owner/repo/branch/path
- `fetchContents(config)` - list files via API
- `downloadFile(file, config)` - fetch file content

`detectProvider()` in `lib/providers/index.ts` routes URLs to correct provider.

### Download Flow

1. `POST /api/download` receives URL + optional token/branch
2. Provider parses URL, fetches directory contents recursively
3. `collectFilesWithContent()` in `lib/download.ts` parallelizes file downloads
4. Files zipped via archiver and streamed back

### UI

- shadcn/ui (new-york style) in `components/ui/`
- Tailwind v4 with CSS variables
- `@/*` path alias to project root

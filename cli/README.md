# subdir

Download a subdirectory from git repositories (GitHub, GitLab).

## Install

```bash
npm install -g subdir
# or
pnpm add -g subdir
```

## Usage

```bash
subdir <url> [options]
```

### Options

- `-o, --output <dir>` - Output directory (defaults to folder name)
- `-t, --token <token>` - Access token for private repos
- `-b, --branch <branch>` - Override branch/ref

### Examples

**GitHub:**
```bash
subdir https://github.com/owner/repo/tree/main/src/components
subdir https://github.com/owner/repo/tree/main/docs -o my-docs
```

**GitLab:**
```bash
subdir https://gitlab.com/owner/repo/-/tree/main/lib
subdir https://gitlab.com/group/subgroup/repo/-/tree/main/src
```

**Private repos:**
```bash
subdir https://github.com/owner/private-repo/tree/main/src -t ghp_xxxxx
subdir https://gitlab.com/owner/private-repo/-/tree/main/src -t glpat-xxxxx
```

## Supported Providers

- GitHub
- GitLab (including subgroups)

## License

ISC

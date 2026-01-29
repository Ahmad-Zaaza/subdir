"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ProviderBadge } from "./provider-badge";
import { toast } from "sonner";
import { detectProvider } from "@/lib/providers";
import { downloadDirectory } from "@/lib/client-download";
import { DownloadError } from "@/lib/errors";
import type { DownloadProgress } from "@/lib/types";

const TOKENS_KEY = "subdir:tokens";

type ProviderName = "github" | "gitlab" | "bitbucket";

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function detectProviderName(url: string): ProviderName | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "github.com") return "github";
    if (parsed.hostname === "gitlab.com") return "gitlab";
    if (parsed.hostname === "bitbucket.org") return "bitbucket";
    return null;
  } catch {
    return null;
  }
}

function isValidRepoUrl(url: string): boolean {
  const provider = detectProviderName(url);
  if (!provider) return false;

  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.length >= 2;
  } catch {
    return false;
  }
}

function loadSavedTokens(): Record<ProviderName, string> {
  if (typeof window === "undefined") {
    return { github: "", gitlab: "", bitbucket: "" };
  }
  try {
    const saved = localStorage.getItem(TOKENS_KEY);
    if (saved) {
      return { github: "", gitlab: "", bitbucket: "", ...JSON.parse(saved) };
    }
  } catch {}
  return { github: "", gitlab: "", bitbucket: "" };
}

function saveTokens(tokens: Record<ProviderName, string>) {
  const filtered = Object.fromEntries(
    Object.entries(tokens).filter(([, v]) => v)
  );
  if (Object.keys(filtered).length === 0) {
    localStorage.removeItem(TOKENS_KEY);
  } else {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(filtered));
  }
}

function getProgressText(progress: DownloadProgress): string {
  switch (progress.phase) {
    case "fetching":
      return `Scanning directory... (${progress.current} files found)`;
    case "downloading":
      return `Downloading ${progress.current}/${progress.total}: ${progress.currentFile || ""}`;
    case "zipping":
      return `Creating ZIP... ${progress.current}/${progress.total}`;
    default:
      return "Processing...";
  }
}

function getProgressPercent(progress: DownloadProgress): number {
  if (progress.total === 0) return 0;
  return Math.round((progress.current / progress.total) * 100);
}

export function DownloadForm() {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [provider, setProvider] = useState<ProviderName | null>(null);
  const [savedTokens, setSavedTokens] = useState<Record<ProviderName, string>>({
    github: "",
    gitlab: "",
    bitbucket: "",
  });
  const [rememberToken, setRememberToken] = useState(true);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<DownloadError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSavedTokens(loadSavedTokens());
  }, []);

  useEffect(() => {
    const newProvider = url ? detectProviderName(url) : null;
    setProvider(newProvider);
    if (newProvider && savedTokens[newProvider]) {
      setToken(savedTokens[newProvider]);
      setIsAdvancedOpen(true);
    }
  }, [url, savedTokens]);

  const isValid = isValidRepoUrl(url);

  const handleCancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
    setProgress(null);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValid) {
      toast.error("Enter a valid GitHub, GitLab, or Bitbucket URL");
      return;
    }

    const repoProvider = detectProvider(url);
    if (!repoProvider) {
      toast.error("Could not detect provider");
      return;
    }

    setIsLoading(true);
    setProgress({ phase: "fetching", current: 0, total: 0 });
    abortRef.current = new AbortController();

    try {
      const parsed = repoProvider.parseUrl(url);
      const config = {
        ...parsed,
        token: token || undefined,
        signal: abortRef.current.signal,
      };

      await downloadDirectory(repoProvider, config, setProgress);

      // Save token if remember is checked
      if (rememberToken && token && provider) {
        const newTokens = { ...savedTokens, [provider]: token };
        setSavedTokens(newTokens);
        saveTokens(newTokens);
      }

      toast.success("Download started!");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        toast.info("Download cancelled");
        return;
      }

      if (err instanceof DownloadError) {
        setError(err);
        toast.error(err.message);
      } else {
        const message = err instanceof Error ? err.message : "Download failed";
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
      setProgress(null);
      abortRef.current = null;
    }
  }

  const handleRetry = () => {
    setError(null);
    handleSubmit(new Event("submit") as unknown as React.FormEvent);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="url" className="text-sm font-medium">
            Repository URL
          </Label>
          <ProviderBadge provider={provider} />
        </div>
        <Input
          id="url"
          type="url"
          placeholder="https://github.com/owner/repo/tree/main/path"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isLoading}
          className={`h-12 text-base ${url && !isValid ? "border-destructive" : ""}`}
        />
        {url && !provider && (
          <p className="text-sm text-destructive">
            Enter a valid GitHub, GitLab, or Bitbucket URL
          </p>
        )}
      </div>

      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            Advanced options
            <ChevronIcon isOpen={isAdvancedOpen} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="token" className="text-sm">
              Access token (for private repos)
            </Label>
            <Input
              id="token"
              type="password"
              placeholder="ghp_xxxx, glpat-xxxx, or app password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={rememberToken}
              onCheckedChange={(checked) => setRememberToken(checked === true)}
              disabled={isLoading}
            />
            <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
              Remember token for this provider
            </Label>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 space-y-2">
          <p className="text-sm font-medium text-destructive">{error.message}</p>
          <p className="text-sm text-muted-foreground">{error.suggestion}</p>
          {error.retryable && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="mt-2"
            >
              Retry
            </Button>
          )}
        </div>
      )}

      {progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground truncate max-w-[70%]">
              {getProgressText(progress)}
            </span>
            <span className="text-muted-foreground">
              {progress.phase !== "fetching" && `${getProgressPercent(progress)}%`}
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width:
                  progress.phase === "fetching"
                    ? "100%"
                    : `${getProgressPercent(progress)}%`,
                animation: progress.phase === "fetching" ? "pulse 2s infinite" : undefined,
              }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="submit"
          size="lg"
          className="flex-1 gap-2"
          disabled={!isValid || isLoading}
        >
          {isLoading ? (
            <>
              <LoadingSpinner />
              Downloading...
            </>
          ) : (
            <>
              <DownloadIcon />
              Download ZIP
            </>
          )}
        </Button>
        {isLoading && (
          <Button type="button" variant="outline" size="lg" onClick={handleCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

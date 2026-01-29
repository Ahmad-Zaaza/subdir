export enum DownloadErrorCode {
  RATE_LIMITED = "RATE_LIMITED",
  NOT_FOUND = "NOT_FOUND",
  AUTH_REQUIRED = "AUTH_REQUIRED",
  INVALID_TOKEN = "INVALID_TOKEN",
  NETWORK_ERROR = "NETWORK_ERROR",
  EMPTY_DIRECTORY = "EMPTY_DIRECTORY",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  CORS_BLOCKED = "CORS_BLOCKED",
  INVALID_URL = "INVALID_URL",
  PROVIDER_ERROR = "PROVIDER_ERROR",
}

export class DownloadError extends Error {
  code: DownloadErrorCode;
  retryable: boolean;
  suggestion: string;

  constructor(
    message: string,
    code: DownloadErrorCode,
    suggestion: string,
    retryable = false
  ) {
    super(message);
    this.name = "DownloadError";
    this.code = code;
    this.suggestion = suggestion;
    this.retryable = retryable;
  }
}

export function createRateLimitError(provider: string): DownloadError {
  return new DownloadError(
    `${provider} API rate limit exceeded`,
    DownloadErrorCode.RATE_LIMITED,
    `Add a ${provider} token to increase the limit`,
    true
  );
}

export function createNotFoundError(): DownloadError {
  return new DownloadError(
    "Repository or path not found",
    DownloadErrorCode.NOT_FOUND,
    "Check URL—repo or path may not exist",
    false
  );
}

export function createAuthRequiredError(): DownloadError {
  return new DownloadError(
    "Authentication required",
    DownloadErrorCode.AUTH_REQUIRED,
    "This repo is private. Add a token.",
    true
  );
}

export function createInvalidTokenError(): DownloadError {
  return new DownloadError(
    "Invalid or expired token",
    DownloadErrorCode.INVALID_TOKEN,
    "Token may be expired or lack permissions",
    true
  );
}

export function createNetworkError(): DownloadError {
  return new DownloadError(
    "Network error",
    DownloadErrorCode.NETWORK_ERROR,
    "Check your connection",
    true
  );
}

export function createEmptyDirectoryError(): DownloadError {
  return new DownloadError(
    "Directory is empty",
    DownloadErrorCode.EMPTY_DIRECTORY,
    "Directory exists but contains no files",
    false
  );
}

export function createFileTooLargeError(filename: string): DownloadError {
  return new DownloadError(
    `File too large: ${filename}`,
    DownloadErrorCode.FILE_TOO_LARGE,
    "File exceeds 100MB browser download limit",
    false
  );
}

export function createCorsError(): DownloadError {
  return new DownloadError(
    "CORS blocked",
    DownloadErrorCode.CORS_BLOCKED,
    "Try a different browser or use a token",
    true
  );
}

export function createInvalidUrlError(): DownloadError {
  return new DownloadError(
    "Invalid URL",
    DownloadErrorCode.INVALID_URL,
    "Enter a valid GitHub, GitLab, or Bitbucket URL",
    false
  );
}

export function createProviderError(message: string): DownloadError {
  return new DownloadError(
    message,
    DownloadErrorCode.PROVIDER_ERROR,
    "Try again or check the URL",
    true
  );
}

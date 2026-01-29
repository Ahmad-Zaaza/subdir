import { describe, it, expect } from "vitest";
import {
  DownloadError,
  DownloadErrorCode,
  createRateLimitError,
  createNotFoundError,
  createAuthRequiredError,
  createInvalidTokenError,
  createNetworkError,
  createEmptyDirectoryError,
  createFileTooLargeError,
  createCorsError,
  createInvalidUrlError,
  createProviderError,
} from "../errors";

describe("DownloadError", () => {
  it("creates error with correct properties", () => {
    const error = new DownloadError(
      "Test error",
      DownloadErrorCode.NETWORK_ERROR,
      "Try again",
      true
    );

    expect(error.message).toBe("Test error");
    expect(error.code).toBe(DownloadErrorCode.NETWORK_ERROR);
    expect(error.suggestion).toBe("Try again");
    expect(error.retryable).toBe(true);
    expect(error.name).toBe("DownloadError");
  });

  it("defaults retryable to false", () => {
    const error = new DownloadError(
      "Test",
      DownloadErrorCode.NOT_FOUND,
      "Check URL"
    );
    expect(error.retryable).toBe(false);
  });
});

describe("Error factories", () => {
  it("createRateLimitError", () => {
    const error = createRateLimitError("GitHub");
    expect(error.code).toBe(DownloadErrorCode.RATE_LIMITED);
    expect(error.message).toContain("GitHub");
    expect(error.retryable).toBe(true);
  });

  it("createNotFoundError", () => {
    const error = createNotFoundError();
    expect(error.code).toBe(DownloadErrorCode.NOT_FOUND);
    expect(error.retryable).toBe(false);
  });

  it("createAuthRequiredError", () => {
    const error = createAuthRequiredError();
    expect(error.code).toBe(DownloadErrorCode.AUTH_REQUIRED);
    expect(error.retryable).toBe(true);
  });

  it("createInvalidTokenError", () => {
    const error = createInvalidTokenError();
    expect(error.code).toBe(DownloadErrorCode.INVALID_TOKEN);
    expect(error.retryable).toBe(true);
  });

  it("createNetworkError", () => {
    const error = createNetworkError();
    expect(error.code).toBe(DownloadErrorCode.NETWORK_ERROR);
    expect(error.retryable).toBe(true);
  });

  it("createEmptyDirectoryError", () => {
    const error = createEmptyDirectoryError();
    expect(error.code).toBe(DownloadErrorCode.EMPTY_DIRECTORY);
    expect(error.retryable).toBe(false);
  });

  it("createFileTooLargeError", () => {
    const error = createFileTooLargeError("bigfile.zip");
    expect(error.code).toBe(DownloadErrorCode.FILE_TOO_LARGE);
    expect(error.message).toContain("bigfile.zip");
    expect(error.retryable).toBe(false);
  });

  it("createCorsError", () => {
    const error = createCorsError();
    expect(error.code).toBe(DownloadErrorCode.CORS_BLOCKED);
    expect(error.retryable).toBe(true);
  });

  it("createInvalidUrlError", () => {
    const error = createInvalidUrlError();
    expect(error.code).toBe(DownloadErrorCode.INVALID_URL);
    expect(error.retryable).toBe(false);
  });

  it("createProviderError", () => {
    const error = createProviderError("API error 500");
    expect(error.code).toBe(DownloadErrorCode.PROVIDER_ERROR);
    expect(error.message).toBe("API error 500");
    expect(error.retryable).toBe(true);
  });
});

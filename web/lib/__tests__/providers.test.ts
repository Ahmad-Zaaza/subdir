import { describe, it, expect } from "vitest";
import { github } from "../providers/github";
import { gitlab } from "../providers/gitlab";
import { bitbucket } from "../providers/bitbucket";
import { detectProvider, getProviderName } from "../providers";

describe("GitHub provider", () => {
  describe("canHandle", () => {
    it("accepts github.com URLs", () => {
      expect(github.canHandle("https://github.com/owner/repo")).toBe(true);
      expect(github.canHandle("https://github.com/owner/repo/tree/main/src")).toBe(true);
    });

    it("rejects non-github URLs", () => {
      expect(github.canHandle("https://gitlab.com/owner/repo")).toBe(false);
      expect(github.canHandle("https://bitbucket.org/owner/repo")).toBe(false);
      expect(github.canHandle("invalid-url")).toBe(false);
    });
  });

  describe("parseUrl", () => {
    it("parses simple repo URL", () => {
      const result = github.parseUrl("https://github.com/facebook/react");
      expect(result).toEqual({
        owner: "facebook",
        repo: "react",
        branch: "main",
        path: "",
      });
    });

    it("parses tree URL with branch and path", () => {
      const result = github.parseUrl("https://github.com/facebook/react/tree/v18/packages/react");
      expect(result).toEqual({
        owner: "facebook",
        repo: "react",
        branch: "v18",
        path: "packages/react",
      });
    });

    it("parses blob URL", () => {
      const result = github.parseUrl("https://github.com/owner/repo/blob/main/src/index.ts");
      expect(result).toEqual({
        owner: "owner",
        repo: "repo",
        branch: "main",
        path: "src/index.ts",
      });
    });

    it("throws on invalid URL", () => {
      expect(() => github.parseUrl("https://github.com/owner")).toThrow(
        "Invalid GitHub URL"
      );
    });
  });
});

describe("GitLab provider", () => {
  describe("canHandle", () => {
    it("accepts gitlab.com URLs", () => {
      expect(gitlab.canHandle("https://gitlab.com/owner/repo")).toBe(true);
    });

    it("rejects non-gitlab URLs", () => {
      expect(gitlab.canHandle("https://github.com/owner/repo")).toBe(false);
    });
  });

  describe("parseUrl", () => {
    it("parses simple repo URL", () => {
      const result = gitlab.parseUrl("https://gitlab.com/gitlab-org/gitlab");
      expect(result).toEqual({
        owner: "gitlab-org",
        repo: "gitlab",
        branch: "main",
        path: "",
      });
    });

    it("parses tree URL with branch and path", () => {
      const result = gitlab.parseUrl("https://gitlab.com/gitlab-org/gitlab/-/tree/master/app");
      expect(result).toEqual({
        owner: "gitlab-org",
        repo: "gitlab",
        branch: "master",
        path: "app",
      });
    });

    it("parses subgroup URL", () => {
      const result = gitlab.parseUrl("https://gitlab.com/group/subgroup/project");
      expect(result).toEqual({
        owner: "group/subgroup",
        repo: "project",
        branch: "main",
        path: "",
      });
    });
  });
});

describe("Bitbucket provider", () => {
  describe("canHandle", () => {
    it("accepts bitbucket.org URLs", () => {
      expect(bitbucket.canHandle("https://bitbucket.org/owner/repo")).toBe(true);
    });

    it("rejects non-bitbucket URLs", () => {
      expect(bitbucket.canHandle("https://github.com/owner/repo")).toBe(false);
    });
  });

  describe("parseUrl", () => {
    it("parses simple repo URL", () => {
      const result = bitbucket.parseUrl("https://bitbucket.org/atlassian/python-bitbucket");
      expect(result).toEqual({
        owner: "atlassian",
        repo: "python-bitbucket",
        branch: "main",
        path: "",
      });
    });

    it("parses src URL with branch and path", () => {
      const result = bitbucket.parseUrl("https://bitbucket.org/atlassian/repo/src/master/lib");
      expect(result).toEqual({
        owner: "atlassian",
        repo: "repo",
        branch: "master",
        path: "lib",
      });
    });
  });
});

describe("detectProvider", () => {
  it("detects GitHub", () => {
    const provider = detectProvider("https://github.com/owner/repo");
    expect(provider?.name).toBe("github");
  });

  it("detects GitLab", () => {
    const provider = detectProvider("https://gitlab.com/owner/repo");
    expect(provider?.name).toBe("gitlab");
  });

  it("detects Bitbucket", () => {
    const provider = detectProvider("https://bitbucket.org/owner/repo");
    expect(provider?.name).toBe("bitbucket");
  });

  it("returns null for unknown providers", () => {
    expect(detectProvider("https://example.com/owner/repo")).toBeNull();
  });
});

describe("getProviderName", () => {
  it("returns provider name for known URLs", () => {
    expect(getProviderName("https://github.com/owner/repo")).toBe("github");
    expect(getProviderName("https://gitlab.com/owner/repo")).toBe("gitlab");
    expect(getProviderName("https://bitbucket.org/owner/repo")).toBe("bitbucket");
  });

  it("returns null for unknown URLs", () => {
    expect(getProviderName("https://example.com/owner/repo")).toBeNull();
  });
});

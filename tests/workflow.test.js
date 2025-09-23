import { jest } from "@jest/globals";
import {
  parseRepositoryURL,
  generateWorkflow,
} from "../public/scripts/workflow.js";
import jsyaml from "js-yaml";

describe("parseRepositoryURL", () => {
  describe("valid slugs and URLs", () => {
    test("shorthand owner/repo", () => {
      expect(parseRepositoryURL("owner/repo")).toEqual({
        origin: "https://github.com",
        hostname: "github.com",
        owner: "owner",
        repo: "repo",
      });
    });
    test("https and http URLs", () => {
      expect(
        parseRepositoryURL("https://github.com/octocat/hello-world"),
      ).toEqual({
        origin: "https://github.com",
        hostname: "github.com",
        owner: "octocat",
        repo: "hello-world",
      });
      expect(
        parseRepositoryURL("http://github.com/octocat/hello-world"),
      ).toEqual({
        origin: "http://github.com",
        hostname: "github.com",
        owner: "octocat",
        repo: "hello-world",
      });
    });
    test("enterprise and custom domains", () => {
      expect(
        parseRepositoryURL(
          "https://github.com/enterprises/mycompany/octocat/hello-world",
        ),
      ).toEqual({
        origin: "https://github.com",
        hostname: "github.com",
        enterprise: "mycompany",
        owner: "octocat",
        repo: "hello-world",
      });
      expect(
        parseRepositoryURL("https://mycompany.github.com/octocat/hello-world"),
      ).toEqual({
        origin: "https://mycompany.github.com",
        hostname: "mycompany.github.com",
        owner: "octocat",
        repo: "hello-world",
      });
      expect(
        parseRepositoryURL("https://github.mycompany.com/octocat/hello-world"),
      ).toEqual({
        origin: "https://github.mycompany.com",
        hostname: "github.mycompany.com",
        owner: "octocat",
        repo: "hello-world",
      });
    });
    test("URLs without protocol", () => {
      expect(parseRepositoryURL("github.com/octocat/hello-world")).toEqual({
        origin: "https://github.com",
        hostname: "github.com",
        owner: "octocat",
        repo: "hello-world",
      });
      expect(
        parseRepositoryURL("mycompany.github.com/octocat/hello-world"),
      ).toEqual({
        origin: "https://mycompany.github.com",
        hostname: "mycompany.github.com",
        owner: "octocat",
        repo: "hello-world",
      });
      expect(
        parseRepositoryURL("github.mycompany.com/octocat/hello-world"),
      ).toEqual({
        origin: "https://github.mycompany.com",
        hostname: "github.mycompany.com",
        owner: "octocat",
        repo: "hello-world",
      });
    });
    test("URLs with trailing characters", () => {
      expect(
        parseRepositoryURL("https://github.com/octocat/hello-world/"),
      ).toEqual({
        origin: "https://github.com",
        hostname: "github.com",
        owner: "octocat",
        repo: "hello-world",
      });
      expect(
        parseRepositoryURL("https://github.com/octocat/hello-world/README.md"),
      ).toEqual({
        origin: "https://github.com",
        hostname: "github.com",
        owner: "octocat",
        repo: "hello-world",
      });
      expect(
        parseRepositoryURL("https://github.com/octocat/hello-world.git"),
      ).toEqual({
        origin: "https://github.com",
        hostname: "github.com",
        owner: "octocat",
        repo: "hello-world",
      });
    });
  });

  describe("valid SSH and git protocol URLs", () => {
    test("SSH URLs", () => {
      expect(
        parseRepositoryURL("git@github.com:octocat/hello-world.git"),
      ).toEqual({
        origin: "https://github.com",
        hostname: "github.com",
        owner: "octocat",
        repo: "hello-world",
      });
      expect(
        parseRepositoryURL("ssh://git@github.com/octocat/hello-world.git"),
      ).toEqual({
        origin: "https://github.com",
        hostname: "github.com",
        owner: "octocat",
        repo: "hello-world",
      });
      expect(
        parseRepositoryURL(
          "git@github.com:enterprises/mycompany/octocat/hello-world.git",
        ),
      ).toEqual({
        origin: "https://github.com",
        hostname: "github.com",
        enterprise: "mycompany",
        owner: "octocat",
        repo: "hello-world",
      });
      expect(
        parseRepositoryURL(
          "ssh://git@mycompany.github.com/octocat/hello-world.git",
        ),
      ).toEqual({
        origin: "https://mycompany.github.com",
        hostname: "mycompany.github.com",
        owner: "octocat",
        repo: "hello-world",
      });
      expect(
        parseRepositoryURL("git@github.mycompany.com:octocat/hello-world.git"),
      ).toEqual({
        origin: "https://github.mycompany.com",
        hostname: "github.mycompany.com",
        owner: "octocat",
        repo: "hello-world",
      });
      expect(
        parseRepositoryURL(
          "ssh://git@github.mycompany.com/octocat/hello-world.git",
        ),
      ).toEqual({
        origin: "https://github.mycompany.com",
        hostname: "github.mycompany.com",
        owner: "octocat",
        repo: "hello-world",
      });
    });
    test("SSH URLs without .git", () => {
      expect(parseRepositoryURL("git@github.com:octocat/hello-world")).toEqual({
        origin: "https://github.com",
        hostname: "github.com",
        owner: "octocat",
        repo: "hello-world",
      });
    });
    test("git protocol URLs", () => {
      expect(
        parseRepositoryURL("git://github.com/octocat/hello-world.git"),
      ).toEqual({
        origin: "https://github.com",
        hostname: "github.com",
        owner: "octocat",
        repo: "hello-world",
      });
      expect(
        parseRepositoryURL("git://github.com/octocat/hello-world"),
      ).toEqual({
        origin: "https://github.com",
        hostname: "github.com",
        owner: "octocat",
        repo: "hello-world",
      });
    });
  });

  describe("case insensitivity", () => {
    test("protocol/host case insensitivity, preserve owner/repo case", () => {
      expect(parseRepositoryURL("OWNER/REPO")).toEqual({
        origin: "https://github.com",
        hostname: "github.com",
        owner: "OWNER",
        repo: "REPO",
      });
      expect(parseRepositoryURL("GitHub.com/OctoCat/Hello-World")).toEqual({
        origin: "https://github.com",
        hostname: "github.com",
        owner: "OctoCat",
        repo: "Hello-World",
      });
      expect(
        parseRepositoryURL("HTTPS://GITHUB.COM/OctoCat/Hello-World"),
      ).toEqual({
        origin: "https://github.com",
        hostname: "github.com",
        owner: "OctoCat",
        repo: "Hello-World",
      });
      expect(
        parseRepositoryURL("git@github.com:OctoCat/Hello-World.git"),
      ).toEqual({
        origin: "https://github.com",
        hostname: "github.com",
        owner: "OctoCat",
        repo: "Hello-World",
      });
      expect(
        parseRepositoryURL("ssh://git@github.com/OctoCat/Hello-World.git"),
      ).toEqual({
        origin: "https://github.com",
        hostname: "github.com",
        owner: "OctoCat",
        repo: "Hello-World",
      });
      expect(
        parseRepositoryURL("git://github.com/OctoCat/Hello-World.git"),
      ).toEqual({
        origin: "https://github.com",
        hostname: "github.com",
        owner: "OctoCat",
        repo: "Hello-World",
      });
    });
  });

  describe("invalid inputs", () => {
    test("invalid slugs", () => {
      expect(parseRepositoryURL("owner")).toBeNull();
      expect(parseRepositoryURL("")).toBeNull();
      expect(parseRepositoryURL("/owner/")).toBeNull();
    });
    test("invalid URLs", () => {
      expect(parseRepositoryURL("https://github.com/")).toBeNull();
      expect(parseRepositoryURL("https://github.com/owner")).toBeNull();
      expect(parseRepositoryURL("https://github.com/owner/")).toBeNull();
    });
  });

  describe("edge cases", () => {
    test("URLs with ports", () => {
      expect(
        parseRepositoryURL("https://github.com:8080/octocat/hello-world"),
      ).toEqual({
        origin: "https://github.com:8080",
        hostname: "github.com",
        owner: "octocat",
        repo: "hello-world",
      });
      expect(
        parseRepositoryURL(
          "https://github.mycompany.com:8080/octocat/hello-world",
        ),
      ).toEqual({
        origin: "https://github.mycompany.com:8080",
        hostname: "github.mycompany.com",
        owner: "octocat",
        repo: "hello-world",
      });
    });
    test("inputs with whitespace", () => {
      expect(parseRepositoryURL("  owner/repo  ")).toEqual({
        origin: "https://github.com",
        hostname: "github.com",
        owner: "owner",
        repo: "repo",
      });
      expect(
        parseRepositoryURL("  https://github.com/octocat/hello-world  "),
      ).toEqual({
        origin: "https://github.com",
        hostname: "github.com",
        owner: "octocat",
        repo: "hello-world",
      });
    });
  });
});

describe("detectDefaultBranch", () => {
  // Mock fetch globally for all tests in this suite
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  test("returns null for null input", async () => {
    const { detectDefaultBranch } = await import(
      "../public/scripts/workflow.js"
    );
    const branch = await detectDefaultBranch(null);
    expect(branch).toBeNull();
  });

  test("detects default branch via GitHub API", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ default_branch: "dev" }),
    });
    const { detectDefaultBranch } = await import(
      "../public/scripts/workflow.js"
    );
    const repoInfo = {
      origin: "https://github.com",
      hostname: "github.com",
      owner: "o",
      repo: "r",
    };
    const branch = await detectDefaultBranch(repoInfo);
    expect(branch).toBe("dev");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/o/r",
      expect.any(Object),
    );
  });

  test("detects default branch via GitHub Enterprise API", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ default_branch: "dev" }),
    });
    const { detectDefaultBranch } = await import(
      "../public/scripts/workflow.js"
    );
    const repoInfo = {
      origin: "https://mycompany.github.com",
      hostname: "mycompany.github.com",
      owner: "o",
      repo: "r",
    };
    const branch = await detectDefaultBranch(repoInfo);
    expect(branch).toBe("dev");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://mycompany.github.com/api/v3/repos/o/r",
      expect.any(Object),
    );
  });

  test("returns null if GitHub API response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    const { detectDefaultBranch } = await import(
      "../public/scripts/workflow.js"
    );
    const repoInfo = {
      origin: "https://github.com",
      hostname: "github.com",
      owner: "o",
      repo: "r",
    };
    const branch = await detectDefaultBranch(repoInfo);
    expect(branch).toBeNull();
  });

  test("detects 'main' branch on fallback", async () => {
    global.fetch = jest.fn().mockImplementation((url) => {
      return Promise.resolve({ ok: url.includes("main") });
    });
    const { detectDefaultBranch } = await import(
      "../public/scripts/workflow.js"
    );
    const repoInfo = {
      origin: "https://github.com",
      hostname: "github.com",
      owner: "o",
      repo: "r",
    };
    const branch = await detectDefaultBranch(repoInfo);
    expect(branch).toBe("main");
  });

  test("detects 'master' branch on fallback", async () => {
    global.fetch = jest.fn().mockImplementation((url) => {
      return Promise.resolve({ ok: url.includes("master") });
    });
    const { detectDefaultBranch } = await import(
      "../public/scripts/workflow.js"
    );
    const repoInfo = {
      origin: "https://github.com",
      hostname: "github.com",
      owner: "o",
      repo: "r",
    };
    const branch = await detectDefaultBranch(repoInfo);
    expect(branch).toBe("master");
  });

  test("detects 'develop' branch on fallback", async () => {
    global.fetch = jest.fn().mockImplementation((url) => {
      return Promise.resolve({ ok: url.includes("develop") });
    });
    const { detectDefaultBranch } = await import(
      "../public/scripts/workflow.js"
    );
    const repoInfo = {
      origin: "https://github.com",
      hostname: "github.com",
      owner: "o",
      repo: "r",
    };
    const branch = await detectDefaultBranch(repoInfo);
    expect(branch).toBe("develop");
  });

  test("returns null if no fallback branches found", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    const { detectDefaultBranch } = await import(
      "../public/scripts/workflow.js"
    );
    const repoInfo = {
      origin: "https://github.com",
      hostname: "github.com",
      owner: "o",
      repo: "r",
    };
    const branch = await detectDefaultBranch(repoInfo);
    expect(branch).toBeNull();
  });

  test("handles fetch errors gracefully", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));
    const { detectDefaultBranch } = await import(
      "../public/scripts/workflow.js"
    );
    const repoInfo = {
      origin: "https://github.com",
      hostname: "github.com",
      owner: "o",
      repo: "r",
    };
    const branch = await detectDefaultBranch(repoInfo);
    expect(branch).toBeNull();
  });
});

describe("generateWorkflow", () => {
  test("default workflow", () => {
    const yaml = generateWorkflow({});
    expect(() => jsyaml.load(yaml)).not.toThrow();
    expect(yaml).toContain("name: MATLAB");
    expect(yaml).toContain("on:");
    expect(yaml).toContain("jobs:");
    expect(yaml).toContain("runs-on: ubuntu-latest");
    expect(yaml).not.toContain("MLM_LICENSE_TOKEN");
    expect(yaml).not.toContain("Xvfb");
    expect(yaml).not.toContain("matrix");
  });

  test("workflow with batch token", () => {
    const yaml = generateWorkflow({ useBatchToken: true });
    expect(() => jsyaml.load(yaml)).not.toThrow();
    expect(yaml).toContain("MLM_LICENSE_TOKEN");
  });

  test("workflow with virtual display", () => {
    const yaml = generateWorkflow({ useVirtualDisplay: true });
    expect(() => jsyaml.load(yaml)).not.toThrow();
    expect(yaml).toContain("Xvfb :99 &");
    expect(yaml).toContain("DISPLAY=:99");
  });

  test("workflow with build across platforms", () => {
    const yaml = generateWorkflow({ buildAcrossPlatforms: true });
    expect(() => jsyaml.load(yaml)).not.toThrow();
    expect(yaml).toContain("matrix");
    expect(yaml).toContain("os: [ubuntu-latest, windows-latest, macos-latest]");
    expect(yaml).toContain("runs-on: ${{ matrix.os }}");
  });

  test("workflow with all options", () => {
    const yaml = generateWorkflow({
      useBatchToken: true,
      useVirtualDisplay: true,
      buildAcrossPlatforms: true,
    });
    expect(() => jsyaml.load(yaml)).not.toThrow();
    expect(yaml).toContain("MLM_LICENSE_TOKEN");
    expect(yaml).toContain("Xvfb :99 &");
    expect(yaml).toContain("matrix");
    expect(yaml).toContain("runs-on: ${{ matrix.os }}");
  });
});

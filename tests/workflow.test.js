import {
  parseRepositoryURL,
  generateWorkflow as _generateWorkflow,
} from "../public/scripts/workflow.js";
import jsyaml from "js-yaml";

function generateWorkflow(options = {}) {
  return _generateWorkflow({ ...options, jsyaml });
}

describe("parseRepositoryURL", () => {
  test("valid slug", () => {
    expect(parseRepositoryURL("owner/repo")).toEqual({
      origin: "https://github.com",
      owner: "owner",
      repo: "repo",
    });
  });

  test("valid URL", () => {
    expect(
      parseRepositoryURL("https://github.com/octocat/Hello-World"),
    ).toEqual({
      origin: "https://github.com",
      owner: "octocat",
      repo: "Hello-World",
    });
    expect(
      parseRepositoryURL(
        "https://github.com/enterprises/mycompany/octocat/Hello-World",
      ),
    ).toEqual({
      origin: "https://github.com",
      enterprise: "mycompany",
      owner: "octocat",
      repo: "Hello-World",
    });
    expect(
      parseRepositoryURL("https://mycompany.github.com/octocat/Hello-World"),
    ).toEqual({
      origin: "https://mycompany.github.com",
      owner: "octocat",
      repo: "Hello-World",
    });
  });

  test("valid URL with trailing characters", () => {
    expect(
      parseRepositoryURL("https://github.com/octocat/Hello-World/"),
    ).toEqual({
      origin: "https://github.com",
      owner: "octocat",
      repo: "Hello-World",
    });
    expect(
      parseRepositoryURL("https://github.com/octocat/Hello-World/README.md"),
    ).toEqual({
      origin: "https://github.com",
      owner: "octocat",
      repo: "Hello-World",
    });
    expect(
      parseRepositoryURL("https://github.com/octocat/Hello-World.git"),
    ).toEqual({
      origin: "https://github.com",
      owner: "octocat",
      repo: "Hello-World",
    });
  });

  test("invalid slug", () => {
    expect(parseRepositoryURL("owner")).toBeNull();
    expect(parseRepositoryURL("")).toBeNull();
    expect(parseRepositoryURL("/owner/")).toBeNull();
    expect(parseRepositoryURL("owner/repo/extra")).toBeNull();
  });

  test("invalid URL", () => {
    expect(parseRepositoryURL("https://github.com/")).toBeNull();
    expect(parseRepositoryURL("https://github.com/owner")).toBeNull();
    expect(parseRepositoryURL("https://github.com/owner/")).toBeNull();
    expect(
      parseRepositoryURL("git@github.com:octocat/Hello-World.git"),
    ).toBeNull();
    expect(
      parseRepositoryURL("ssh://git@github.com/owner/repo.git"),
    ).toBeNull();
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

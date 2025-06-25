import { jest } from "@jest/globals";

beforeEach(async () => {
  jest.resetModules();
  jest.clearAllMocks();

  window.jsyaml = { dump: () => "yaml-content" };
  window.bootstrap = { Tooltip: jest.fn() };
  global.URL.createObjectURL = jest.fn(() => "blob:url");
  global.URL.revokeObjectURL = jest.fn();

  document.body.innerHTML = `
    <form id="generate-form">
      <input id="repo" />
      <input type="checkbox" id="use-batch-token" />
      <input type="checkbox" id="use-virtual-display" />
      <input type="checkbox" id="build-across-platforms" />
      <button type="submit" id="generate-button"></button>
    </form>
    <a id="download-alert-link"></a>
    <div id="download-alert" class="d-none"></div>
  `;

  await import("../public/scripts/main.js");
  window.navigateTo = jest.fn();
});

test("form submit with invalid repo shows error", () => {
  const repoInput = document.getElementById("repo");
  expect(repoInput.classList.contains("is-invalid")).toBe(false);
  repoInput.value = "invalidrepo";
  document
    .getElementById("generate-form")
    .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  expect(repoInput.classList.contains("is-invalid")).toBe(true);
  expect(window.navigateTo).not.toHaveBeenCalled();
});

test("form submit with valid slug works", () => {
  const repoInput = document.getElementById("repo");
  repoInput.value = "owner/repo";
  document
    .getElementById("generate-form")
    .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  expect(window.navigateTo).toHaveBeenCalledWith(
    expect.stringContaining("https://github.com/owner/repo/new/main?filename="),
  );
});

test("form submit with valid URL works", () => {
  const repoInput = document.getElementById("repo");
  repoInput.value = "https://github.com/octocat/Hello-World";
  document
    .getElementById("generate-form")
    .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  expect(window.navigateTo).toHaveBeenCalledWith(
    expect.stringContaining(
      "https://github.com/octocat/Hello-World/new/main?filename=",
    ),
  );
});

test("form submit with valid cloud-hosted enterprise URL works", () => {
  const repoInput = document.getElementById("repo");
  repoInput.value = "https://github.com/enterprises/gh/octocat/Hello-World";
  document
    .getElementById("generate-form")
    .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  expect(window.navigateTo).toHaveBeenCalledWith(
    expect.stringContaining(
      "https://github.com/enterprises/gh/octocat/Hello-World/new/main?filename=",
    ),
  );
});

test("advanced options are passed to generateWorkflow", async () => {
  // Re-import main.js with a spy on generateWorkflow
  jest.resetModules();
  const workflowSpy = jest.fn(() => "yaml-content");
  jest.unstable_mockModule("../public/scripts/workflow.js", () => ({
    parseRepositoryURL: (v) => ({ owner: "o", repo: "r" }),
    generateWorkflow: workflowSpy,
  }));
  window.jsyaml = { dump: () => "yaml-content" };
  document.getElementById("repo").value = "o/r";
  document.getElementById("use-batch-token").checked = true;
  document.getElementById("use-virtual-display").checked = false;
  document.getElementById("build-across-platforms").checked = true;
  await import("../public/scripts/main.js");
  window.navigateTo = jest.fn();
  document
    .getElementById("generate-form")
    .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  expect(workflowSpy).toHaveBeenCalledWith({
    useBatchToken: true,
    useVirtualDisplay: false,
    buildAcrossPlatforms: true,
    siteUrl: "http://localhost",
    jsyaml: window.jsyaml,
  });
});

test("download link triggers file download", () => {
  const repoInput = document.getElementById("repo");
  repoInput.value = "owner/repo";

  window.jsyaml = { dump: () => "yaml-content" };

  const mockCreateObjectURL = jest.fn(() => "blob:url");
  const mockRevokeObjectURL = jest.fn();
  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;

  const a = document.createElement("a");
  document.body.appendChild(a);
  jest.spyOn(document, "createElement").mockImplementation((tag) => {
    if (tag === "a") return a;
    return document.createElement(tag);
  });
  const clickSpy = jest.spyOn(a, "click");

  document.getElementById("download-alert-link").click();

  expect(mockCreateObjectURL).toHaveBeenCalled();
  expect(clickSpy).toHaveBeenCalled();
  expect(mockRevokeObjectURL).toHaveBeenCalled();
});

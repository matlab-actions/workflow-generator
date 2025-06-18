import { jest } from "@jest/globals";

beforeEach(async () => {
  jest.resetModules();
  jest.clearAllMocks();

  window.jsyaml = { dump: () => "yaml-content" };
  window.bootstrap = { Tooltip: jest.fn() };
  global.URL.createObjectURL = jest.fn(() => "blob:url");
  global.URL.revokeObjectURL = jest.fn();

  document.body.innerHTML = `
    <form id="generateForm">
      <input id="repo" />
      <input type="checkbox" id="useBatchToken" />
      <input type="checkbox" id="useVirtualDisplay" />
      <input type="checkbox" id="buildAcrossPlatforms" />
      <button type="submit" id="generateButton"></button>
    </form>
    <a id="downloadButton"></a>
  `;

  await import("../public/scripts/main.js");
  window.navigateTo = jest.fn();
});

test("form submit with invalid repo shows error", () => {
  const repoInput = document.getElementById("repo");
  expect(repoInput.classList.contains("is-invalid")).toBe(false);
  repoInput.value = "invalidrepo";
  document
    .getElementById("generateForm")
    .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  expect(repoInput.classList.contains("is-invalid")).toBe(true);
  expect(window.navigateTo).not.toHaveBeenCalled();
});

test("form submit with valid slug works", () => {
  const repoInput = document.getElementById("repo");
  repoInput.value = "owner/repo";
  document
    .getElementById("generateForm")
    .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  expect(window.navigateTo).toHaveBeenCalledWith(
    expect.stringContaining("https://github.com/owner/repo/new/main?filename="),
  );
});

test("form submit with valid URL works", () => {
  const repoInput = document.getElementById("repo");
  repoInput.value = "https://github.com/octocat/Hello-World";
  document
    .getElementById("generateForm")
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
    .getElementById("generateForm")
    .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  expect(window.navigateTo).toHaveBeenCalledWith(
    expect.stringContaining(
      "https://github.com/enterprises/gh/octocat/Hello-World/new/main?filename=",
    ),
  );
});

test("download button triggers download", () => {
  document.getElementById("downloadButton").click();
  expect(global.URL.createObjectURL).toHaveBeenCalled();
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
  document.getElementById("useBatchToken").checked = true;
  document.getElementById("useVirtualDisplay").checked = false;
  document.getElementById("buildAcrossPlatforms").checked = true;
  await import("../public/scripts/main.js");
  window.navigateTo = jest.fn();
  document
    .getElementById("generateForm")
    .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  expect(workflowSpy).toHaveBeenCalledWith({
    useBatchToken: true,
    useVirtualDisplay: false,
    buildAcrossPlatforms: true,
    siteUrl: "http://localhost",
    jsyaml: window.jsyaml,
  });
});

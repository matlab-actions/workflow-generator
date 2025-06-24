/* global bootstrap */
import { parseRepositoryURL, generateWorkflow } from "./workflow.js";

function navigateTo(url) {
  window.open(url, "_blank");
}
window.navigateTo = navigateTo;

function generateWorkflowWithFormInputs() {
  return generateWorkflow({
    useBatchToken: document.getElementById("use-batch-token").checked,
    useVirtualDisplay: document.getElementById("use-virtual-display").checked,
    buildAcrossPlatforms: document.getElementById("build-across-platforms")
      .checked,
    jsyaml: window.jsyaml,
    siteUrl:
      window.location.origin + window.location.pathname.replace(/\/[^/]*$/, ""),
  });
}

function handleFormSubmit(e) {
  e.preventDefault();

  const repoField = document.getElementById("repo");
  const repoInfo = parseRepositoryURL(repoField.value.trim());
  if (!repoInfo) {
    repoField.classList.add("is-invalid");
    return;
  }
  repoField.classList.remove("is-invalid");

  const workflow = generateWorkflowWithFormInputs();

  const encoded = encodeURIComponent(workflow);
  const filePath = ".github/workflows/matlab.yml";

  let url = repoInfo.origin;
  if (repoInfo.enterprise) {
    url += `/enterprises/${repoInfo.enterprise}`;
  }
  url += `/${repoInfo.owner}/${repoInfo.repo}/new/main?filename=${filePath}&value=${encoded}`;

  window.navigateTo(url);
}

document
  .getElementById("generate-form")
  .addEventListener("submit", handleFormSubmit);

document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
  new bootstrap.Tooltip(el);
});

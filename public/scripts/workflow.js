function parseRepositoryURL(repoURL) {
  // Remove any trailing .git suffix and trim whitespace
  repoURL = repoURL.trim().replace(/\.git$/i, "");

  // Normalize all input to HTTP(S) URL for easier parsing
  let m = repoURL.match(
    /^(git@|ssh:\/\/git@|git:\/\/)([^:/]+)[:/]((?:[^/]+\/)+[^/]+)$/i,
  );
  if (m) {
    // SSH or git: git@github.com:owner/repo or ssh://git@github.com/owner/repo or git://github.com/owner/repo
    repoURL = `https://${m[2]}/${m[3]}`;
  } else if (!/^\w+:\/\//.test(repoURL)) {
    // Shorthand: owner/repo or host/owner/repo
    const parts = repoURL.split("/").filter(Boolean);
    if (parts.length >= 3 && parts[0].includes(".")) {
      // host/owner/repo
      repoURL = `https://${repoURL}`;
    } else if (parts.length >= 2 && !parts[0].includes(".")) {
      // owner/repo
      repoURL = `https://github.com/${parts[0]}/${parts[1]}`;
    }
  }

  // Parse the normalized URL and extract components
  try {
    const url = new URL(repoURL);
    const parts = url.pathname.split("/").filter(Boolean);
    if (
      url.host.toLowerCase() === "github.com" &&
      parts[0] === "enterprises" &&
      parts.length >= 4
    ) {
      // Enterprise: http(s)://github.com/enterprises/enterprise/owner/repo
      return {
        origin: url.origin,
        hostname: url.hostname,
        enterprise: parts[1],
        owner: parts[2],
        repo: parts[3],
      };
    } else if (parts.length >= 2) {
      // Standard: http(s)://host/owner/repo
      return {
        origin: url.origin,
        hostname: url.hostname,
        owner: parts[0],
        repo: parts[1],
      };
    }
  } catch {
    // Not a valid URL
  }
  return null;
}

async function detectDefaultBranch(repoInfo) {
  if (!repoInfo) return null;

  async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3 seconds timeout
    try {
      const resp = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return resp;
    } finally {
      clearTimeout(timeout);
    }
  }

  // Try to detect default branch using the GitHub API
  async function tryApi() {
    let apiUrl;
    if (repoInfo.hostname.replace(/^www\./, "") === "github.com") {
      apiUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`;
    } else {
      apiUrl = `${origin}/api/v3/repos/${repoInfo.owner}/${repoInfo.repo}`;
    }

    try {
      const resp = await fetchWithTimeout(apiUrl, {
        headers: { Accept: "application/vnd.github+json" },
      });

      if (!resp.ok) return null;

      const data = await resp.json();
      return data.default_branch || null;
    } catch {
      // Network or abort error, fallback
      return null;
    }
  }

  // Fallback: Probe common branch names by checking for a README.md
  async function tryBlobFallback() {
    let repoBaseUrl;
    if (repoInfo.hostname.replace(/^www\./, "") === "github.com") {
      repoBaseUrl = "https://github.com";
    } else {
      repoBaseUrl = `${repoInfo.origin}`;
    }
    if (repoInfo.enterprise) {
      repoBaseUrl += `/enterprises/${repoInfo.enterprise}`;
    }
    repoBaseUrl += `/${repoInfo.owner}/${repoInfo.repo}`;

    const branches = ["main", "master", "develop"];
    const checks = branches.map(async (branch) => {
      const url = `${repoBaseUrl}/blob/${branch}/README.md`;
      try {
        const resp = await fetchWithTimeout(url, {
          method: "HEAD",
          redirect: "manual",
        });
        return resp.ok ? branch : null;
      } catch {
        return null;
      }
    });
    const results = await Promise.all(checks);
    return results.find((branch) => branch !== null) || null;
  }

  // Main logic: Try API first, then fallback if needed
  const apiBranch = await tryApi();
  if (apiBranch) return apiBranch;
  return await tryBlobFallback();
}

function generateWorkflow({
  useBatchToken = false,
  useVirtualDisplay = false,
  buildAcrossPlatforms = false,
  siteUrl = "http://localhost/",
  branch = "main",
}) {
  return dedent(`
  # This workflow was generated using the GitHub Actions Workflow Generator for MATLAB.
  # See ${siteUrl}

  name: MATLAB

  on:
    push:
      branches: [${branch}]
    pull_request:
      branches: [${branch}]
    workflow_dispatch: {}
  ${
    useBatchToken
      ? `
  env:
    # To use a batch token in this workflow, first create an MLM_LICENSE_TOKEN secret in your repository settings.
    # See https://github.com/matlab-actions/setup-matlab/#use-matlab-batch-licensing-token
    MLM_LICENSE_TOKEN: \${{ secrets.MLM_LICENSE_TOKEN }}
    `
      : ``
  }
  jobs:
    build:
      ${
        buildAcrossPlatforms
          ? `
      strategy:
        fail-fast: false
        matrix:
          os: [ubuntu-latest, windows-latest, macos-latest]
      runs-on: \${{ matrix.os }}
      `.trimStart()
          : `
      runs-on: ubuntu-latest
      `.trimStart()
      }
      steps:
        - uses: actions/checkout@v4
        ${
          useVirtualDisplay
            ? `
        - name: Start virtual display server
          if: runner.os == 'Linux'
          run: |
            sudo apt-get install -y xvfb
            Xvfb :99 &
            echo "DISPLAY=:99" >> $GITHUB_ENV
        `
            : ``
        }
        # Set up MATLAB and other MathWorks products on the runner.
        - name: Set up MATLAB
          uses: matlab-actions/setup-matlab@v2
          with:
            release: latest
            cache: true
            # Set up additional products using the products input.
            # See https://github.com/matlab-actions/setup-matlab/#set-up-matlab
            # products: Simulink Deep_Learning_Toolbox

        # Run tests authored using the MATLAB unit testing framework or Simulink Test.
        - name: Run MATLAB tests
          uses: matlab-actions/run-tests@v2
          # If you are not using a MATLAB project, add your source code to the path using the source-folder input.
          # with:
          #   source-folder: myfolderA; myfolderB

        # Alternatively, run tasks from your buildfile.m.
        # - name: Run MATLAB build
        #   uses: matlab-actions/run-build@v2
        #   with:
        #     tasks: test

        # Alternatively, run MATLAB scripts, functions, and statements.
        # - name: Run MATLAB command
        #   uses: matlab-actions/run-command@v2
        #   with:
        #     command: results = runtests('IncludeSubfolders',true); assertSuccess(results);
  `);
}

function dedent(str) {
  str = str.replace(/^\n/, "");
  let match = str.match(/^\s+/);
  return match ? str.replace(new RegExp("^" + match[0], "gm"), "") : str;
}

export { parseRepositoryURL, detectDefaultBranch, generateWorkflow };

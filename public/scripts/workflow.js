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
        enterprise: parts[1],
        owner: parts[2],
        repo: parts[3],
      };
    } else if (parts.length >= 2) {
      // Standard: http(s)://host/owner/repo
      return {
        origin: url.origin,
        owner: parts[0],
        repo: parts[1],
      };
    }
  } catch {
    // Not a valid URL
  }
  return null;
}

function generateWorkflow({
  useBatchToken = false,
  useVirtualDisplay = false,
  buildAcrossPlatforms = false,
  siteUrl = "http://localhost/",
}) {
  return dedent(`
  # This workflow was generated using the GitHub Actions Workflow Generator for MATLAB.
  # See ${siteUrl}

  name: MATLAB

  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]
    workflow_dispatch: {}
  ${
    useBatchToken
      ? `
  env:
    # To use a batch token in this workflow, first create an MLM_LICENSE_TOKEN secret in your repository settings.
    # https://github.com/matlab-actions/setup-matlab/#use-matlab-batch-licensing-token
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
        - name: Set up MATLAB
          uses: matlab-actions/setup-matlab@v2
          with:
            # Set up additional products using the 'products' input.
            # See https://github.com/matlab-actions/setup-matlab/#set-up-matlab
            # products: Simulink Deep_Learning_Toolbox
            cache: true

        - name: Run MATLAB tests
          uses: matlab-actions/run-tests@v2
  `);
}

function dedent(str) {
  str = str.replace(/^\n/, "");
  let match = str.match(/^\s+/);
  return match ? str.replace(new RegExp("^" + match[0], "gm"), "") : str;
}

export { parseRepositoryURL, generateWorkflow };

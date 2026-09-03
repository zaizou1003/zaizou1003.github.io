import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  DEPENDABOT_PATH,
  WORKFLOW_PATH,
  validateDependabotSource,
  validateRepositoryWorkflowConfiguration,
  validateWorkflowConfiguration,
  validateWorkflowSource,
} from '../../scripts/validate-workflow.mjs';

const [approvedWorkflow, approvedDependabot] = await Promise.all([
  readFile(WORKFLOW_PATH, 'utf8'),
  readFile(DEPENDABOT_PATH, 'utf8'),
]);
const packageManifest = JSON.parse(await readFile('package.json', 'utf8'));

function replaceOnce(source, approved, unsafe) {
  assert.equal(source.includes(approved), true, `Fixture anchor must exist: ${approved}`);
  return source.replace(approved, unsafe);
}

function rejectsWorkflowMutation(approved, unsafe) {
  assert.throws(
    () => validateWorkflowSource(replaceOnce(approvedWorkflow, approved, unsafe)),
    /workflow-contract/,
  );
}

function rejectsDependabotMutation(approved, unsafe) {
  assert.throws(
    () => validateDependabotSource(replaceOnce(approvedDependabot, approved, unsafe)),
    /dependabot-contract/,
  );
}

test('the production validator accepts only the checked-in workflow and Dependabot contracts', async () => {
  const result = await validateRepositoryWorkflowConfiguration();
  assert.equal(result.status, 'verified');
  assert.deepEqual(result.workflow.jobs, ['verify', 'prepare_pages', 'deploy']);
  assert.equal(result.workflow.actionUses, 7);
  assert.deepEqual(result.dependabot.ecosystems, ['npm', 'github-actions']);
});

test('package scripts integrate production workflow validation without dependency changes', () => {
  assert.equal(packageManifest.scripts['validate:workflow'], 'node scripts/validate-workflow.mjs');
  assert.match(packageManifest.scripts['test:build'], /tests\/build\/workflow\.test\.js/);
  assert.match(packageManifest.scripts.quality, /^npm run validate:workflow && /);
});

test('action references reject mutable tags, unapproved actions, extra actions, and pin-comment drift', async (context) => {
  const fixtures = [
    [
      'mutable tag',
      'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1',
      'actions/checkout@v7.0.1 # v7.0.1',
    ],
    [
      'unapproved action',
      'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0',
      'example/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0',
    ],
    [
      'fifth action',
      '      - name: Run the complete quality suite',
      '      - uses: actions/cache@0123456789012345678901234567890123456789 # v1.0.0\n      - name: Run the complete quality suite',
    ],
    [
      'release comment drift',
      '# v5.0.1',
      '# v5.0.0',
    ],
  ];
  for (const [label, approved, unsafe] of fixtures) {
    await context.test(label, () => rejectsWorkflowMutation(approved, unsafe));
  }
});

test('trigger mutations cannot admit target, manual, chained, scheduled, or wildcard execution', async (context) => {
  const fixtures = [
    ['pull_request_target', '  pull_request:', '  pull_request_target:'],
    ['workflow_dispatch', '  pull_request:', '  workflow_dispatch:\n  pull_request:'],
    ['workflow_run', '  pull_request:', '  workflow_run:\n  pull_request:'],
    ['schedule', '  pull_request:', '  schedule:\n    - cron: "0 0 * * *"\n  pull_request:'],
    ['wildcard branch', '      - main', '      - "*"'],
  ];
  for (const [label, approved, unsafe] of fixtures) {
    await context.test(label, () => rejectsWorkflowMutation(approved, unsafe));
  }
});

test('read-only verification and preparation reject writes, secrets, and checkout weakening', async (context) => {
  const fixtures = [
    ['top-level write', '  contents: read', '  contents: write'],
    ['prepare Pages write', '    permissions:\n      contents: read', '    permissions:\n      contents: read\n      pages: write'],
    ['prepare OIDC write', '    permissions:\n      contents: read', '    permissions:\n      contents: read\n      id-token: write'],
    ['secret reference', '        run: npm run quality', '        env:\n          TOKEN: ${{ secrets.TOKEN }}\n        run: npm run quality'],
    ['persisted credentials', '          persist-credentials: false', '          persist-credentials: true'],
    ['LFS enabled', '          lfs: false', '          lfs: true'],
    ['submodules enabled', '          submodules: false', '          submodules: recursive'],
  ];
  for (const [label, approved, unsafe] of fixtures) {
    await context.test(label, () => rejectsWorkflowMutation(approved, unsafe));
  }
});

test('installation, runtime, Chrome, and Oxlint gates fail closed under unsafe mutations', async (context) => {
  const fixtures = [
    ['npm install', 'npm ci --ignore-scripts', 'npm install'],
    ['lifecycle scripts enabled', 'npm ci --ignore-scripts', 'npm ci'],
    ['Windows npm command', 'npm run quality', 'npm.cmd run quality'],
    ['missing Oxlint probe', './node_modules/.bin/oxlint --version', 'node --version'],
    ['hardcoded Chrome path', 'browser_path="$(command -v google-chrome)"', 'browser_path="/usr/bin/google-chrome"'],
    ['suppressed Chrome discovery', 'browser_path="$(command -v google-chrome)"', 'browser_path="$(command -v google-chrome || true)"'],
    ['missing executable check', '          test -x "$browser_path"', '          test -n "$browser_path"'],
    ['missing browser export', "          printf 'BROWSER_PATH=%s\\n' \"$browser_path\" >> \"$GITHUB_ENV\"", '          true'],
    ['environment dump', '          node --version', '          env\n          node --version'],
    ['browser download', '          node --version', '          npx playwright install chromium\n          node --version'],
  ];
  for (const [label, approved, unsafe] of fixtures) {
    await context.test(label, () => rejectsWorkflowMutation(approved, unsafe));
  }
});

test('verification failure cannot be bypassed by preparation or artifact upload', async (context) => {
  const fixtures = [
    ['missing verify dependency', '    needs: verify', '    needs: []'],
    [
      'pull requests excluded from preparation',
      "      github.event_name == 'pull_request' ||",
      "      github.event_name == 'push' ||",
    ],
    ['always preparation', '    needs: verify', '    needs: verify\n    if: always()'],
    ['continued failed quality', '        run: npm run quality', '        continue-on-error: true\n        run: npm run quality'],
    ['suppressed build failure', '        run: npm run build', '        run: npm run build || true'],
    [
      'upload before verification',
      '      - name: Build the production distribution',
      '      - name: Prepare early Pages artifact\n        uses: actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9 # v5.0.0\n        with:\n          name: github-pages\n          path: dist\n          retention-days: 7\n          include-hidden-files: false\n      - name: Build the production distribution',
    ],
  ];
  for (const [label, approved, unsafe] of fixtures) {
    await context.test(label, () => rejectsWorkflowMutation(approved, unsafe));
  }
});

test('artifact and deploy mutations cannot broaden the trusted Pages boundary', async (context) => {
  const fixtures = [
    ['source upload', '          path: dist', '          path: .'],
    ['wrong artifact name', '          name: github-pages', '          name: review-pages'],
    ['hidden files', '          include-hidden-files: false', '          include-hidden-files: true'],
    ['PR retention', '          retention-days: 7', '          retention-days: 1'],
    ['main retention', '          retention-days: 1', '          retention-days: 7'],
    ['deploy without preparation', '    needs: prepare_pages', '    needs: verify'],
    [
      'deploy without push guard',
      "    if: github.event_name == 'push' && github.ref == 'refs/heads/main' && github.repository == 'zaizou1003/zaizou1003.github.io'",
      "    if: github.ref == 'refs/heads/main' && github.repository == 'zaizou1003/zaizou1003.github.io'",
    ],
    [
      'deploy without main-ref guard',
      "    if: github.event_name == 'push' && github.ref == 'refs/heads/main' && github.repository == 'zaizou1003/zaizou1003.github.io'",
      "    if: github.event_name == 'push' && github.repository == 'zaizou1003/zaizou1003.github.io'",
    ],
    [
      'deploy without repository guard',
      "    if: github.event_name == 'push' && github.ref == 'refs/heads/main' && github.repository == 'zaizou1003/zaizou1003.github.io'",
      "    if: github.event_name == 'push' && github.ref == 'refs/heads/main'",
    ],
    ['deployment environment drift', '      name: github-pages', '      name: production'],
    ['cancel active deployment', '      cancel-in-progress: false', '      cancel-in-progress: true'],
  ];
  for (const [label, approved, unsafe] of fixtures) {
    await context.test(label, () => rejectsWorkflowMutation(approved, unsafe));
  }
});

test('tracked distribution output is rejected by the production configuration validator', () => {
  assert.throws(
    () =>
      validateWorkflowConfiguration({
        workflowSource: approvedWorkflow,
        dependabotSource: approvedDependabot,
        trackedDistPaths: ['dist/index.html'],
      }),
    /dist must remain untracked/,
  );
});

test('Dependabot schedule, ecosystem, limit, grouping, and action allowlist drift is rejected', async (context) => {
  const fixtures = [
    ['npm ecosystem', '  - package-ecosystem: npm', '  - package-ecosystem: pip'],
    ['schedule day', '      day: monday', '      day: tuesday'],
    ['schedule time', '      time: "06:00"', '      time: "07:00"'],
    ['timezone', '      timezone: Europe/Paris', '      timezone: UTC'],
    ['PR limit', '    open-pull-requests-limit: 5', '    open-pull-requests-limit: 10'],
    ['development grouping', '        dependency-type: development', '        dependency-type: production'],
    ['update grouping', '          - minor\n          - patch', '          - major\n          - minor\n          - patch'],
    ['action allowlist', '      - dependency-name: actions/checkout', '      - dependency-name: actions/cache'],
    ['extra ecosystem', 'updates:', 'updates:\n  - package-ecosystem: docker\n    directory: /'],
  ];
  for (const [label, approved, unsafe] of fixtures) {
    await context.test(label, () => rejectsDependabotMutation(approved, unsafe));
  }
});

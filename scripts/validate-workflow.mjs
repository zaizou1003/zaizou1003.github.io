import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = resolve(scriptDirectory, '..');

export const WORKFLOW_PATH = '.github/workflows/pages.yml';
export const DEPENDABOT_PATH = '.github/dependabot.yml';
export const APPROVED_WORKFLOW_SHA256 =
  'de94345022eb97f210bffdc7e92ac873de68a0329d5b7aed70903f17bc0a081d';
export const APPROVED_DEPENDABOT_SHA256 =
  '1dcede7d4c51282ec45a4204cb5e620afc05837787844a63ceea76fd59d381aa';
export const APPROVED_ACTION_PINS = Object.freeze({
  'actions/checkout': Object.freeze({
    sha: '3d3c42e5aac5ba805825da76410c181273ba90b1',
    release: 'v7.0.1',
    expectedUses: 2,
  }),
  'actions/setup-node': Object.freeze({
    sha: '820762786026740c76f36085b0efc47a31fe5020',
    release: 'v7.0.0',
    expectedUses: 2,
  }),
  'actions/upload-pages-artifact': Object.freeze({
    sha: 'fc324d3547104276b827a68afc52ff2a11cc49c9',
    release: 'v5.0.0',
    expectedUses: 2,
  }),
  'actions/deploy-pages': Object.freeze({
    sha: '368f82528645a54fb793d4d04e342629a3f51346',
    release: 'v5.0.1',
    expectedUses: 1,
  }),
});

function normalizeSource(source, label) {
  if (typeof source !== 'string' || source.length === 0) {
    throw new Error(`${label}-contract: source must be non-empty text`);
  }
  if (source.charCodeAt(0) === 0xfeff || /\r(?!\n)/.test(source)) {
    throw new Error(`${label}-contract: unsupported text encoding or line ending`);
  }
  return source.replaceAll('\r\n', '\n');
}

function sha256(source) {
  return createHash('sha256').update(source, 'utf8').digest('hex');
}

function assertExactSource(source, expectedSha256, label) {
  const normalized = normalizeSource(source, label);
  if (sha256(normalized) !== expectedSha256) {
    throw new Error(`${label}-contract: configuration differs from the approved fail-closed source`);
  }
  return normalized;
}

export function validateWorkflowSource(source) {
  const normalized = assertExactSource(source, APPROVED_WORKFLOW_SHA256, 'workflow');
  const uses = [...normalized.matchAll(/^\s*uses:\s+([^@\s]+)@([0-9a-f]{40})\s+#\s+(v\d+\.\d+\.\d+)\s*$/gm)];
  const actualCounts = new Map();
  for (const [, action, pin, release] of uses) {
    const approved = APPROVED_ACTION_PINS[action];
    if (!approved || approved.sha !== pin || approved.release !== release) {
      throw new Error('workflow-contract: unapproved action, pin, or release comment');
    }
    actualCounts.set(action, (actualCounts.get(action) ?? 0) + 1);
  }
  for (const [action, approved] of Object.entries(APPROVED_ACTION_PINS)) {
    if (actualCounts.get(action) !== approved.expectedUses) {
      throw new Error(`workflow-contract: unexpected use count for ${action}`);
    }
  }
  if (uses.length !== 7) throw new Error('workflow-contract: unexpected action count');
  return {
    status: 'verified',
    actions: Object.keys(APPROVED_ACTION_PINS),
    actionUses: uses.length,
    jobs: ['verify', 'prepare_pages', 'deploy'],
  };
}

export function validateDependabotSource(source) {
  assertExactSource(source, APPROVED_DEPENDABOT_SHA256, 'dependabot');
  return {
    status: 'verified',
    ecosystems: ['npm', 'github-actions'],
    actionAllowlist: Object.keys(APPROVED_ACTION_PINS),
  };
}

export function validateWorkflowConfiguration({
  workflowSource,
  dependabotSource,
  trackedDistPaths = [],
}) {
  const workflow = validateWorkflowSource(workflowSource);
  const dependabot = validateDependabotSource(dependabotSource);
  if (!Array.isArray(trackedDistPaths) || trackedDistPaths.some((path) => path.trim() !== '')) {
    throw new Error('workflow-contract: dist must remain untracked');
  }
  return { status: 'verified', workflow, dependabot, trackedDistPaths: 0 };
}

export async function validateRepositoryWorkflowConfiguration({
  repositoryRoot = defaultRepositoryRoot,
} = {}) {
  const [workflowSource, dependabotSource, trackedDistResult] = await Promise.all([
    readFile(resolve(repositoryRoot, WORKFLOW_PATH), 'utf8'),
    readFile(resolve(repositoryRoot, DEPENDABOT_PATH), 'utf8'),
    execFileAsync('git', ['ls-files', '--', 'dist'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      windowsHide: true,
    }),
  ]);
  const trackedDistPaths = trackedDistResult.stdout
    .split(/\r?\n/)
    .map((path) => path.trim())
    .filter(Boolean);
  return validateWorkflowConfiguration({ workflowSource, dependabotSource, trackedDistPaths });
}

const isCommandLine = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCommandLine) {
  console.log(JSON.stringify(await validateRepositoryWorkflowConfiguration(), null, 2));
}

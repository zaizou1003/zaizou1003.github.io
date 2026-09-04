import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import {
  PAGE_BUDGETS,
  deterministicGzipSize,
  measureTrustedPageAssets,
  validatePageAssetGraph,
} from '../../scripts/check-budgets.mjs';

const paths = Object.freeze({
  home: 'assets/home-AAA111aa.js',
  navigationScript: 'assets/hydrateNavigation-BBB222bb.js',
  navigationStyle: 'assets/hydrateNavigation-CCC333cc.css',
  projects: 'assets/projects-DDD444dd.js',
  projectsStyle: 'assets/projects-EEE555ee.css',
});

function trustedGraph() {
  return {
    home: [
      { path: paths.home, role: 'javascript' },
      { path: paths.navigationScript, role: 'javascript' },
      { path: paths.navigationStyle, role: 'css' },
    ],
    projects: [
      { path: paths.projects, role: 'javascript' },
      { path: paths.navigationScript, role: 'javascript' },
      { path: paths.navigationStyle, role: 'css' },
      { path: paths.projectsStyle, role: 'css' },
    ],
  };
}

async function createAssetFixture(contents = {}) {
  const directory = await mkdtemp(resolve(tmpdir(), 'portfolio-budget-test-'));
  for (const path of Object.values(paths)) {
    const file = resolve(directory, path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, contents[path] ?? `export const fixture = ${JSON.stringify(path)};`);
  }
  return directory;
}

test('budget constants lock the approved per-page gzip ceilings', () => {
  assert.deepEqual(PAGE_BUDGETS, { javascript: 102400, css: 30720 });
});

test('trusted page attribution accepts exactly the five production logical assets', () => {
  assert.equal(validatePageAssetGraph(trustedGraph()).home.length, 3);
});

test('budget graph rejects malformed, duplicate, untrusted and wrongly attributed assets', async (context) => {
  const fixtures = [
    ['query', `${paths.home}?cache=1`, /invalid-budget-asset-reference/],
    ['fragment', `${paths.home}#x`, /invalid-budget-asset-reference/],
    ['backslash', paths.home.replace('/', '\\'), /invalid-budget-asset-reference/],
    ['traversal', `assets/../${paths.home}`, /invalid-budget-asset-reference/],
    ['untrusted', 'assets/legacy-AAA111aa.js', /invalid-budget-asset-reference|untrusted/],
  ];
  for (const [label, path, pattern] of fixtures) {
    await context.test(label, () => {
      const graph = trustedGraph();
      graph.home[0] = { ...graph.home[0], path };
      assert.throws(() => validatePageAssetGraph(graph), pattern);
    });
  }
  await context.test('duplicate', () => {
    const graph = trustedGraph();
    graph.home[1] = { ...graph.home[0] };
    assert.throws(() => validatePageAssetGraph(graph), /duplicate-budget-asset/);
  });
  await context.test('wrong role', () => {
    const graph = trustedGraph();
    graph.projects[0].role = 'css';
    assert.throws(() => validatePageAssetGraph(graph), /wrong-budget-asset-role/);
  });
  await context.test('wrong page', () => {
    const graph = trustedGraph();
    graph.home[0] = { path: paths.projects, role: 'javascript' };
    assert.throws(() => validatePageAssetGraph(graph), /wrong-budget-asset-attribution/);
  });
});

test('production measurement reports only bounded size metadata for each live page asset', async () => {
  const directory = await createAssetFixture();
  try {
    const result = await measureTrustedPageAssets({
      distDirectory: directory,
      pageAssets: trustedGraph(),
    });
    assert.equal(result.status, 'verified');
    assert.deepEqual(result.pages.map(({ page }) => page), ['home', 'projects']);
    for (const page of result.pages) {
      for (const asset of page.assets) {
        assert.deepEqual(Object.keys(asset), [
          'path',
          'role',
          'rawBytes',
          'gzipBytes',
          'limitBytes',
        ]);
        assert.ok(asset.gzipBytes <= asset.limitBytes);
      }
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('gzip measurement is deterministic and over-budget JavaScript fails closed', async () => {
  const sample = Buffer.from('repeatable gzip payload'.repeat(100));
  assert.equal(deterministicGzipSize(sample), deterministicGzipSize(sample));
  const directory = await createAssetFixture({
    [paths.home]: randomBytes(PAGE_BUDGETS.javascript + 8192),
  });
  try {
    await assert.rejects(
      () =>
        measureTrustedPageAssets({
          distDirectory: directory,
          pageAssets: trustedGraph(),
        }),
      /page-javascript-gzip-budget: home/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('missing and non-regular trusted assets fail before measurement', async (context) => {
  const missingDirectory = await createAssetFixture();
  try {
    await rm(resolve(missingDirectory, paths.home));
    await context.test('missing', () =>
      assert.rejects(
        () =>
          measureTrustedPageAssets({
            distDirectory: missingDirectory,
            pageAssets: trustedGraph(),
          }),
        /ENOENT/,
      ),
    );
  } finally {
    await rm(missingDirectory, { recursive: true, force: true });
  }

  const nonRegularDirectory = await createAssetFixture();
  try {
    await rm(resolve(nonRegularDirectory, paths.home));
    await mkdir(resolve(nonRegularDirectory, paths.home));
    await context.test('non-regular', () =>
      assert.rejects(
        () =>
          measureTrustedPageAssets({
            distDirectory: nonRegularDirectory,
            pageAssets: trustedGraph(),
          }),
        /non-regular-budget-asset/,
      ),
    );
  } finally {
    await rm(nonRegularDirectory, { recursive: true, force: true });
  }
});

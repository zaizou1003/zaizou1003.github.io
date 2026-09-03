import assert from 'node:assert/strict';
import test from 'node:test';

import {
  APPROVED_DEPENDENCIES,
  APPROVED_DEV_DEPENDENCIES,
  FORBIDDEN_DELETION_PATHS,
  PROHIBITED_DEPENDENCIES,
  extractImportSpecifiers,
  normalizeRepositoryPath,
  validateDependencyManifest,
  validateEntryContract,
  validateGitignoreContract,
  validateLegacyPathInventory,
  validateLegacyRemovalState,
  validateSourceImports,
  verifyRepositoryLegacyRemoval,
} from '../../scripts/verify-legacy-removal.mjs';

const cleanSourceFiles = Object.freeze({
  'src/entries/home.client.jsx': "import './hydrateNavigation.jsx';\n",
  'src/entries/hydrateNavigation.jsx': "import { hydrateRoot } from 'react-dom/client';\n",
  'src/entries/projects.client.jsx': "import './hydrateProjectsExplorer.jsx';\n",
  'src/entries/hydrateProjectsExplorer.jsx': "import { hydrateRoot } from 'react-dom/client';\n",
  'src/entries/server.jsx': [
    "import { renderToString } from 'react-dom/server';",
    "import { HomePage } from '../pages/HomePage.jsx';",
    "import { ProjectsPage } from '../pages/ProjectsPage.jsx';",
  ].join('\n'),
  'src/pages/HomePage.jsx': "import React from 'react';\nexport function HomePage() { return null; }\n",
  'src/pages/ProjectsPage.jsx': "import React from 'react';\nexport function ProjectsPage() { return null; }\n",
});
const cleanWorkingPaths = Object.freeze([
  '.gitignore',
  'index.html',
  'package.json',
  'projects/index.html',
  'vite.config.js',
  ...Object.keys(cleanSourceFiles),
]);
const cleanPackageManifest = Object.freeze({
  dependencies: { ...APPROVED_DEPENDENCIES },
  devDependencies: { ...APPROVED_DEV_DEPENDENCIES },
});
const cleanEntrySources = Object.freeze({
  viteSource: [
    "base: '/',",
    'publicDir: false,',
    "home: resolve(repositoryRoot, 'index.html'),",
    "projects: resolve(repositoryRoot, 'projects/index.html'),",
    "input: resolve(repositoryRoot, 'src/entries/server.jsx'),",
    'sourcemap: false,',
  ].join('\n'),
  homeHtml:
    '<div id="root"><!--app-html--></div><!--app-root-end--><script type="module" src="/src/entries/home.client.jsx"></script>',
  projectsHtml:
    '<div id="root"><!--app-html--></div><!--app-root-end--><script type="module" src="/src/entries/projects.client.jsx"></script>',
  serverSource: cleanSourceFiles['src/entries/server.jsx'],
});

function createCleanFixture(overrides = {}) {
  return {
    workingPaths: [...cleanWorkingPaths],
    trackedPaths: [...cleanWorkingPaths],
    deletedTrackedPaths: [],
    gitignoreSource: '/build/\ndist/\n/private/\n',
    packageManifest: cleanPackageManifest,
    sourceFiles: cleanSourceFiles,
    existingPaths: [...cleanWorkingPaths],
    entrySources: cleanEntrySources,
    ...overrides,
  };
}

test('the final clean fixture passes through the production aggregate validator', () => {
  const result = validateLegacyRemovalState(createCleanFixture());
  assert.equal(result.status, 'verified');
  assert.deepEqual(result.dependencies, { runtime: 2, development: 4 });
  assert.equal(result.entries.clientEntries, 2);
});

test('the exact deletion manifest is unique and every path is rejected by production rules', async (context) => {
  assert.equal(FORBIDDEN_DELETION_PATHS.length, 68);
  assert.equal(new Set(FORBIDDEN_DELETION_PATHS).size, 68);
  for (const path of FORBIDDEN_DELETION_PATHS) {
    await context.test(path, () => {
      assert.throws(
        () => validateLegacyPathInventory({ workingPaths: [path], trackedPaths: [] }),
        /forbidden-(?:legacy|build|recovery)-path|forbidden-recovery-asset/,
      );
    });
  }
});

test('generic legacy and private asset path classes fail closed', async (context) => {
  const fixtures = [
    ['build prefix', 'build/unreviewed.txt', /forbidden-build-path/],
    ['tracked dist', 'dist/unreviewed.js', /tracked-dist-path/],
    ['GLB', 'public/model.glb', /forbidden-recovery-asset/],
    ['recovered data', 'src/utils/data.js', /forbidden-legacy-path|forbidden-recovery-asset/],
    ['recovered CV', 'src/utils/cv.pdf', /forbidden-recovery-asset/],
    ['certificate image', 'public/certification-private.png', /forbidden-recovery-asset/],
    ['root CNAME', 'CNAME', /forbidden-legacy-path|forbidden-recovery-asset/],
    ['CRA template', 'public/index.html', /forbidden-legacy-path|forbidden-recovery-asset/],
    ['PWA manifest', 'public/manifest.json', /forbidden-legacy-path|forbidden-recovery-asset/],
    ['tracked source map', 'assets/app.js.map', /tracked-source-map/],
  ];
  for (const [label, path, expected] of fixtures) {
    await context.test(label, () => {
      const trackedOnly = label === 'tracked dist' || label === 'tracked source map';
      assert.throws(
        () =>
          validateLegacyPathInventory({
            workingPaths: trackedOnly ? [] : [path],
            trackedPaths: trackedOnly ? [path] : [],
          }),
        expected,
      );
    });
  }
});

test('repository path inputs reject traversal, backslashes, absolute paths, empties, and duplicates', () => {
  for (const path of ['../outside.js', 'src/../outside.js', 'src\\file.js', '/root.js', 'C:/root.js', '']) {
    assert.throws(() => normalizeRepositoryPath(path), /invalid-repository-path/);
  }
  assert.throws(
    () => validateLegacyPathInventory({ workingPaths: ['src/file.js', 'src/file.js'], trackedPaths: [] }),
    /duplicate-working-paths/,
  );
});

test('unstaged tracked deletions are subtracted but malformed deletion inventories fail', () => {
  assert.deepEqual(
    validateLegacyPathInventory({
      workingPaths: ['package.json'],
      trackedPaths: ['package.json', 'build/index.html'],
      deletedTrackedPaths: ['build/index.html'],
    }),
    { workingPathCount: 1, effectiveTrackedPathCount: 1 },
  );
  assert.throws(
    () =>
      validateLegacyPathInventory({
        workingPaths: ['package.json'],
        trackedPaths: ['package.json'],
        deletedTrackedPaths: ['build/index.html'],
      }),
    /deleted-path-not-tracked/,
  );
});

test('the dependency contract accepts only the exact six direct declarations', async (context) => {
  assert.deepEqual(validateDependencyManifest(cleanPackageManifest), { runtime: 2, development: 4 });
  for (const dependency of PROHIBITED_DEPENDENCIES) {
    await context.test(dependency, () => {
      assert.throws(
        () =>
          validateDependencyManifest({
            ...cleanPackageManifest,
            devDependencies: { ...APPROVED_DEV_DEPENDENCIES, [dependency]: '1.0.0' },
          }),
        /dependency-contract-development/,
      );
    });
  }
  assert.throws(
    () => validateDependencyManifest({ ...cleanPackageManifest, dependencies: { react: '19.2.8' } }),
    /dependency-contract-runtime/,
  );
  assert.throws(
    () =>
      validateDependencyManifest({
        ...cleanPackageManifest,
        optionalDependencies: { unexpected: '1.0.0' },
      }),
    /dependency-contract-optionalDependencies/,
  );
});

test('production import extraction covers static, side-effect, export-from, and dynamic imports', () => {
  assert.deepEqual(
    extractImportSpecifiers(
      [
        "import React from 'react';",
        "import './local.js';",
        "export { value } from './value.js';",
        "const module = import('./dynamic.js');",
      ].join('\n'),
    ),
    ['react', './local.js', './value.js', './dynamic.js'],
  );
});

test('every prohibited dependency family is rejected as a source import', async (context) => {
  for (const dependency of PROHIBITED_DEPENDENCIES) {
    await context.test(dependency, () => {
      assert.throws(
        () =>
          validateSourceImports({
            sourceFiles: { 'src/example.js': `import value from '${dependency}';\n` },
            existingPaths: ['src/example.js'],
          }),
        /prohibited-package-import: src\/example\.js/,
      );
    });
  }
});

test('legacy relative, missing, external, and backslash imports fail through production validation', () => {
  const fixtures = [
    ["import value from './components/Projects/index.js';\n", /legacy-relative-import/],
    ["import value from './missing.js';\n", /missing-relative-import/],
    ["import value from 'unlisted-package';\n", /undeclared-source-import/],
    ["import value from '.\\missing.js';\n", /invalid-import-path/],
    ["import value from '../../outside.js';\n", /import-path-traversal/],
  ];
  for (const [source, expected] of fixtures) {
    assert.throws(
      () =>
        validateSourceImports({
          sourceFiles: { 'src/example.js': source },
          existingPaths: ['src/example.js'],
        }),
      expected,
    );
  }
});

test('valid local modules, CSS Modules, directory indexes, and React subpaths resolve', () => {
  const sourceFiles = {
    'src/example.jsx': [
      "import { hydrateRoot } from 'react-dom/client';",
      "import styles from './example.module.css';",
      "import { helper } from './helper';",
      "export { nested } from './nested';",
    ].join('\n'),
    'src/helper.js': 'export const helper = true;\n',
    'src/nested/index.js': 'export const nested = true;\n',
  };
  const result = validateSourceImports({
    sourceFiles,
    existingPaths: [...Object.keys(sourceFiles), 'src/example.module.css'],
  });
  assert.equal(result.sourceModuleCount, 3);
  assert.equal(result.importCount, 4);
});

test('build and dist ignore rules are exact and cannot be missing or negated', () => {
  assert.deepEqual(validateGitignoreContract('/build/\ndist/\n'), {
    buildIgnored: true,
    distIgnored: true,
  });
  assert.throws(() => validateGitignoreContract('dist/\n'), /missing-build-ignore/);
  assert.throws(() => validateGitignoreContract('/build/\n'), /missing-dist-ignore/);
  assert.throws(
    () => validateGitignoreContract('/build/\ndist/\n!dist/\n'),
    /negated-output-ignore/,
  );
});

test('the Vite client and server entry contract rejects alternate entry systems', () => {
  assert.deepEqual(validateEntryContract(cleanEntrySources), { clientEntries: 2, serverEntries: 1 });
  const mutations = [
    { viteSource: cleanEntrySources.viteSource.replace("base: '/',", "base: '/portfolio/',") },
    { viteSource: cleanEntrySources.viteSource.replace('publicDir: false,', "publicDir: 'public',") },
    { homeHtml: cleanEntrySources.homeHtml.replace('home.client.jsx', 'legacy.js') },
    { projectsHtml: cleanEntrySources.projectsHtml.replace('projects.client.jsx', 'legacy.js') },
    { serverSource: cleanEntrySources.serverSource.replace('renderToString', 'createRoot') },
  ];
  for (const mutation of mutations) {
    assert.throws(() => validateEntryContract({ ...cleanEntrySources, ...mutation }), /entry-contract/);
  }
});

test('malformed aggregate inputs and Git inventory failures are rejected without source disclosure', async () => {
  assert.throws(() => validateLegacyRemovalState({}), /malformed-/);
  await assert.rejects(
    () =>
      verifyRepositoryLegacyRemoval({
        exec: async () => {
          throw new Error('unreviewed subprocess detail');
        },
      }),
    (error) => error.message === 'git-inventory-failure',
  );
});

test('the real repository satisfies the final clean legacy-removal contract', async () => {
  const result = await verifyRepositoryLegacyRemoval();
  assert.equal(result.status, 'verified');
  assert.equal(result.dependencies.runtime, 2);
  assert.equal(result.dependencies.development, 4);
  assert.equal(result.entries.clientEntries, 2);
});

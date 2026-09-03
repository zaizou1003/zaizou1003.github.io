import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ACCESSIBILITY_SCENARIOS,
  measureResponsiveAccessibilityState,
  summarizeAxeResults,
} from '../../scripts/verify-browser.mjs';

const repositoryRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const oxlintBin = resolve(repositoryRoot, 'node_modules/oxlint/bin/oxlint');
const configPath = resolve(repositoryRoot, '.oxlintrc.json');
const EXPECTED_LINT_OPERANDS = Object.freeze([
  'vite.config.js',
  'scripts',
  'src/components/content',
  'src/components/experience',
  'src/components/layout',
  'src/components/portfolio-projects',
  'src/components/sections',
  'src/components/ui',
  'src/data',
  'src/entries',
  'src/pages/HomePage.jsx',
  'src/pages/ProjectsPage.jsx',
  'src/utils',
  'src/validation',
  'tests',
]);
const REQUIRED_RULES = Object.freeze([
  'eslint/no-undef',
  'eslint/no-unused-vars',
  'react/rules-of-hooks',
  'react/exhaustive-deps',
  'jsx-a11y/alt-text',
  'jsx-a11y/anchor-has-content',
  'jsx-a11y/anchor-is-valid',
  'jsx-a11y/aria-props',
  'jsx-a11y/aria-proptypes',
  'jsx-a11y/aria-role',
  'jsx-a11y/aria-unsupported-elements',
  'jsx-a11y/click-events-have-key-events',
  'jsx-a11y/control-has-associated-label',
  'jsx-a11y/heading-has-content',
  'jsx-a11y/interactive-supports-focus',
  'jsx-a11y/no-interactive-element-to-noninteractive-role',
  'jsx-a11y/no-noninteractive-element-interactions',
  'jsx-a11y/no-noninteractive-element-to-interactive-role',
  'jsx-a11y/no-noninteractive-tabindex',
  'jsx-a11y/no-static-element-interactions',
  'jsx-a11y/prefer-tag-over-role',
  'jsx-a11y/role-has-required-aria-props',
  'jsx-a11y/role-supports-aria-props',
  'jsx-a11y/tabindex-no-positive',
]);

function runOxlint(args) {
  return spawnSync(process.execPath, [oxlintBin, ...args], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    windowsHide: true,
  });
}

async function collectSourceFiles(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const child = resolve(path, entry.name);
        return entry.isDirectory()
          ? collectSourceFiles(child)
          : /\.(?:js|jsx|mjs)$/.test(entry.name)
            ? [child]
            : [];
      }),
    )
  ).flat();
}

test('Oxlint configuration and package command lock the exact approved scope', async () => {
  const [config, packageJson] = await Promise.all([
    readFile(configPath, 'utf8').then(JSON.parse),
    readFile(resolve(repositoryRoot, 'package.json'), 'utf8').then(JSON.parse),
  ]);
  const tokens = packageJson.scripts.lint.split(' ');
  assert.deepEqual(tokens.slice(0, 4), ['oxlint', '--config', './.oxlintrc.json', '--deny-warnings']);
  assert.deepEqual(tokens.slice(4), EXPECTED_LINT_OPERANDS);
  assert.deepEqual(config.plugins, ['eslint', 'oxc', 'react', 'jsx-a11y']);
  assert.equal(config.categories.correctness, 'error');
  assert.equal(config.options.denyWarnings, true);
  assert.equal(config.options.reportUnusedDisableDirectives, 'error');
  assert.equal(config.settings['jsx-a11y'].components.LinkButton, 'a');
  for (const rule of REQUIRED_RULES) assert.ok(config.rules[rule], `Missing ${rule}`);
  assert.deepEqual(config.ignorePatterns, [
    '/.prerender/**',
    '/build/**',
    '/coverage/**',
    '/dist/**',
    '/node_modules/**',
    '/private/**',
    '/.env*',
  ]);
  assert.equal(config.ignorePatterns.some((ignored) => ignored.startsWith('/src/')), false);
  assert.ok(config.overrides.some(({ env }) => env?.browser === true));
  assert.ok(config.overrides.some(({ env }) => env?.node === true));
});

test('manual quality preview persistently serves the completed dist on the approved address', async () => {
  const packageJson = await readFile(resolve(repositoryRoot, 'package.json'), 'utf8').then(JSON.parse);
  assert.equal(
    packageJson.scripts['preview:quality'],
    'vite preview --host 127.0.0.1 --port 4173 --strictPort',
  );
});

test('the installed Oxlint catalogue accepts every configured rule and rejects unknown rules', async () => {
  const valid = runOxlint(['--config', configPath, '--print-config']);
  assert.equal(valid.status, 0, valid.stderr || valid.stdout);
  const directory = await mkdtemp(resolve(tmpdir(), 'portfolio-oxlint-config-'));
  try {
    const fixture = resolve(directory, 'fixture.js');
    const invalidConfig = resolve(directory, 'invalid.json');
    await writeFile(fixture, 'export const value = 1;\n');
    await writeFile(
      invalidConfig,
      JSON.stringify({ plugins: ['eslint'], rules: { 'eslint/not-a-real-rule': 'error' } }),
    );
    const invalid = runOxlint(['--config', invalidConfig, fixture]);
    assert.notEqual(invalid.status, 0);
    assert.match(`${invalid.stdout}\n${invalid.stderr}`, /not-a-real-rule|unknown/i);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('production Oxlint detects undefined variables, Hooks misuse and mapped LinkButton defects', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'portfolio-oxlint-fixtures-'));
  try {
    const fixtures = [
      ['undefined.jsx', 'export const value = missingValue;\n', /no-undef/],
      [
        'hooks.jsx',
        "import { useEffect } from 'react'; export function Bad({ enabled }) { if (enabled) useEffect(() => {}, []); return null; }\n",
        /rules-of-hooks/,
      ],
      [
        'link.jsx',
        'export function Bad() { return <LinkButton href="#"><span /></LinkButton>; }\n',
        /jsx-a11y(?:\/|\()(?:anchor-has-content|anchor-is-valid)/,
      ],
    ];
    for (const [name, source, rule] of fixtures) {
      const file = resolve(directory, name);
      await writeFile(file, source);
      const result = runOxlint(['--config', configPath, '--deny-warnings', file]);
      assert.notEqual(result.status, 0, `${name} unexpectedly passed`);
      assert.match(`${result.stdout}\n${result.stderr}`, rule);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('the owner-approved suppression allowlist is empty and no lint input contains a directive', async () => {
  const suppressionAllowlist = Object.freeze([]);
  assert.deepEqual(suppressionAllowlist, []);
  const roots = EXPECTED_LINT_OPERANDS.map((operand) => resolve(repositoryRoot, operand));
  const files = (
    await Promise.all(
      roots.map(async (path) => {
        try {
          const name = path.replaceAll('\\', '/');
          return /\.(?:js|jsx|mjs)$/.test(name)
            ? [path]
            : collectSourceFiles(path);
        } catch (error) {
          if (error.code === 'ENOTDIR') return [path];
          throw error;
        }
      }),
    )
  ).flat();
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /\b(?:oxlint|eslint)-(?:disable|enable)\b/);
  }
});

test('axe summaries fail closed and retain only review-safe rule counts', () => {
  const result = summarizeAxeResults({
    violations: [
      { id: 'color-contrast', impact: 'serious', nodes: [{ html: '<private>' }] },
      { id: 'landmark-one-main', impact: 'moderate', nodes: [{}, {}] },
    ],
  });
  assert.deepEqual(result, [
    { id: 'color-contrast', impact: 'serious', nodeCount: 1 },
    { id: 'landmark-one-main', impact: 'moderate', nodeCount: 2 },
  ]);
  assert.equal(JSON.stringify(result).includes('private'), false);
  for (const malformed of [null, {}, { violations: null }, { violations: [{}] }]) {
    assert.throws(() => summarizeAxeResults(malformed), /malformed-axe-results/);
  }
});

test('the responsive and accessibility scenario manifest is exact and immutable', () => {
  assert.deepEqual(
    ACCESSIBILITY_SCENARIOS.hydrated.map(({ id, width, height }) => [id, width, height]),
    [
      ['mobile-320', 320, 900],
      ['mobile-360', 360, 900],
      ['mobile-390', 390, 900],
      ['mobile-landscape', 667, 375],
      ['tablet-768', 768, 1000],
      ['desktop-1024', 1024, 1000],
      ['desktop-1280', 1280, 1000],
      ['desktop-1440', 1440, 1000],
      ['desktop-1920', 1920, 1080],
    ],
  );
  assert.deepEqual(ACCESSIBILITY_SCENARIOS.noJavaScript.map(({ width }) => width), [320, 768, 1440]);
  assert.deepEqual(
    ACCESSIBILITY_SCENARIOS.reflow.map(({ id, width, equivalentZoomPercent }) => [
      id,
      width,
      equivalentZoomPercent,
    ]),
    [
      ['layout-equivalent-200', 640, 200],
      ['layout-equivalent-400', 320, 400],
    ],
  );
  assert.equal(Object.isFrozen(ACCESSIBILITY_SCENARIOS), true);
});

test('the production responsive detector fails closed for overflow, clipping and anchor clearance', () => {
  const originalGlobals = new Map(
    ['document', 'getComputedStyle', 'innerWidth'].map((name) => [
      name,
      Object.getOwnPropertyDescriptor(globalThis, name),
    ]),
  );
  const contentStyle = {
    display: 'block',
    visibility: 'visible',
    overflowX: 'visible',
  };
  const content = {
    clientWidth: 100,
    scrollWidth: 100,
    style: contentStyle,
    getBoundingClientRect: () => ({ left: 0, right: 100, width: 100, height: 20 }),
  };
  const header = {
    style: { display: 'block', visibility: 'visible' },
    getBoundingClientRect: () => ({ left: 0, right: 1000, width: 1000, height: 80 }),
  };
  const anchor = {
    style: { display: 'block', visibility: 'visible', scrollMarginTop: '120px' },
    getBoundingClientRect: () => ({ left: 0, right: 1000, width: 1000, height: 100 }),
  };
  const documentFixture = {
    documentElement: { clientWidth: 1000, scrollWidth: 1000 },
    body: { scrollWidth: 1000 },
    querySelector: (selector) => (selector === '.site-header' ? header : null),
    querySelectorAll: (selector) =>
      selector.startsWith('#root h1')
        ? [content]
        : selector.startsWith('main section[id]')
          ? [anchor]
          : [],
  };

  try {
    Object.defineProperties(globalThis, {
      document: { configurable: true, value: documentFixture },
      getComputedStyle: { configurable: true, value: (element) => element.style },
      innerWidth: { configurable: true, value: 1000 },
    });

    assert.deepEqual(measureResponsiveAccessibilityState(), {
      horizontalOverflow: false,
      clippedContentCount: 0,
      anchorsClearStickyHeader: true,
    });

    documentFixture.documentElement.scrollWidth = 1064;
    assert.equal(measureResponsiveAccessibilityState().horizontalOverflow, true);
    documentFixture.documentElement.scrollWidth = 1000;

    content.scrollWidth = 164;
    contentStyle.overflowX = 'hidden';
    assert.equal(measureResponsiveAccessibilityState().clippedContentCount, 1);
    content.scrollWidth = 100;
    contentStyle.overflowX = 'visible';

    anchor.style.scrollMarginTop = '0px';
    assert.equal(measureResponsiveAccessibilityState().anchorsClearStickyHeader, false);
  } finally {
    for (const [name, descriptor] of originalGlobals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
});

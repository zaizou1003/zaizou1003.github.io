import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { createHydrationMismatchFixture } from '../../scripts/verify-browser.mjs';
import { getPrimaryNavigationItems } from '../../src/components/layout/navigation.js';
import { iconDefinitions, iconNames } from '../../src/components/ui/iconPaths.js';

function readHexToken(css, tokenName) {
  const match = css.match(new RegExp(`--${tokenName}:\\s*(#[0-9a-f]{6})\\s*;`, 'i'));
  assert.ok(match, `Expected --${tokenName} to be defined as a six-digit hex color`);
  return match[1].toUpperCase();
}

function toLinearChannel(channel) {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    .map((channel) => toLinearChannel(Number.parseInt(channel, 16)));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first, second) {
  const luminances = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}

test('the browser gate creates a deliberate mismatch inside the real hydration island', () => {
  const html =
    '<div data-hydrate-navigation><nav><a href="#capabilities">Capabilities</a></nav></div><main><h1>Home</h1></main>';
  const fixture = createHydrationMismatchFixture(html);
  assert.match(fixture, /Hydration mismatch fixture/);
  assert.notEqual(fixture, html);
});

test('mismatch fixture creation fails closed when the hydration island is absent', () => {
  assert.throws(() => createHydrationMismatchFixture('<main>Home</main>'), /navigation island is missing/i);
});

test('primary navigation uses local anchors on Home and root-form anchors on Projects', () => {
  const home = getPrimaryNavigationItems('home');
  const projects = getPrimaryNavigationItems('projects');
  assert.deepEqual(
    home.map(({ label, href }) => [label, href]),
    [
      ['Capabilities', '#capabilities'],
      ['Projects', '#featured-projects'],
      ['Experience', '#experience'],
      ['Skills', '#skills'],
      ['Certifications', '#certifications'],
      ['Education', '#education'],
      ['Contact', '#contact'],
      ['All projects', '/projects/'],
    ],
  );
  assert.deepEqual(
    projects.slice(0, -1).map(({ href }) => href),
    ['/#capabilities', '/#featured-projects', '/#experience', '/#skills', '/#certifications', '/#education', '/#contact'],
  );
  assert.equal(projects.at(-1).current, true);
  assert.equal(home.at(-1).current, false);
  assert.throws(() => getPrimaryNavigationItems('unknown'), /unsupported navigation page/i);
});

test('the curated inline icon catalogue contains only the approved five icons', () => {
  assert.deepEqual(iconNames, ['email', 'github', 'linkedin', 'arrow', 'external']);
  for (const definition of Object.values(iconDefinitions)) {
    assert.ok(definition.viewBox);
    assert.ok(definition.paths.length > 0);
    assert.equal(Object.isFrozen(definition), true);
  }
});

test('design tokens and global CSS preserve focus, target-size and reduced-motion contracts', async () => {
  const [tokens, global] = await Promise.all([
    readFile(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8'),
    readFile(new URL('../../src/styles/global.css', import.meta.url), 'utf8'),
  ]);
  for (const color of [
    '#08111F',
    '#101B2D',
    '#17243A',
    '#F5F7FA',
    '#B7C3D4',
    '#2B3B52',
    '#5B7393',
    '#5EEAD4',
    '#062821',
    '#7DD3FC',
    '#FDE047',
    '#FDA4AF',
  ]) {
    assert.ok(tokens.includes(color));
  }
  assert.match(tokens, /--target-min:\s*2\.75rem/);
  assert.match(tokens, /--focus-width:\s*3px/);
  assert.match(tokens, /--focus-offset:\s*3px/);
  assert.match(global, /:focus-visible/);
  assert.match(global, /position:\s*sticky/);
  assert.match(global, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(global, /scroll-behavior:\s*auto !important/);
  assert.match(global, /transition-duration:\s*0s !important/);
});

test('interactive borders meet 3:1 contrast while decorative borders retain their approved token', async () => {
  const [tokens, global] = await Promise.all([
    readFile(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8'),
    readFile(new URL('../../src/styles/global.css', import.meta.url), 'utf8'),
  ]);
  const controlBorder = readHexToken(tokens, 'color-control-border');
  const approvedSurfaces = [
    readHexToken(tokens, 'color-bg'),
    readHexToken(tokens, 'color-surface'),
    readHexToken(tokens, 'color-surface-raised'),
  ];

  assert.equal(readHexToken(tokens, 'color-border'), '#2B3B52');
  assert.equal(controlBorder, '#5B7393');
  assert.equal(readHexToken(tokens, 'color-focus'), '#FDE047');

  for (const surface of approvedSurfaces) {
    const ratio = contrastRatio(controlBorder, surface);
    assert.ok(
      ratio >= 3,
      `Expected ${controlBorder} to have at least 3:1 contrast against ${surface}; received ${ratio.toFixed(4)}:1`,
    );
  }

  assert.deepEqual(
    approvedSurfaces.map((surface) => Number(contrastRatio(controlBorder, surface).toFixed(4))),
    [3.8895, 3.5493, 3.1991],
  );
  assert.equal(global.match(/var\(--color-control-border\)/g)?.length, 2);
  assert.match(
    global,
    /\.site-nav__summary\s*\{[^}]*border:\s*1px solid var\(--color-control-border\)/s,
  );
  assert.match(
    global,
    /\.link-button--secondary\s*\{[^}]*border-color:\s*var\(--color-control-border\)/s,
  );
  for (const selector of ['surface', 'site-header', 'site-nav__list--mobile', 'tag-list__item', 'site-footer']) {
    const escapedSelector = selector.replaceAll('-', '\\-');
    assert.match(
      global,
      new RegExp(`\\.${escapedSelector}\\s*\\{[^}]*var\\(--color-border\\)`, 's'),
      `Expected .${selector} to retain the decorative border token`,
    );
  }
  assert.match(
    global,
    /\.site-nav__summary:hover,[^}]*border-color:\s*var\(--color-accent\)/s,
  );
  assert.match(
    global,
    /\.link-button--secondary:hover\s*\{[^}]*border-color:\s*var\(--color-accent\)/s,
  );
});

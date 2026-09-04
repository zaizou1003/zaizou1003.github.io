import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

import {
  createHydrationMismatchFixture,
  createProjectsHydrationMismatchFixture,
  resolveQualityEvidenceDirectory,
  verifyBrowser,
} from '../../scripts/verify-browser.mjs';
import { getPrimaryNavigationItems } from '../../src/components/layout/navigation.js';
import { iconDefinitions, iconNames } from '../../src/components/ui/iconPaths.js';

const CLEAN_RUNTIME_PATHS = Object.freeze([
  '../../src/entries/',
  '../../src/pages/HomePage.jsx',
  '../../src/pages/ProjectsPage.jsx',
  '../../src/components/layout/',
  '../../src/components/ui/',
  '../../src/components/sections/',
  '../../src/components/content/',
  '../../src/components/experience/',
  '../../src/components/portfolio-projects/',
]);

async function readRuntimeSources(url) {
  if (!url.pathname.endsWith('/')) return [[url.pathname, await readFile(url, 'utf8')]];
  const entries = await readdir(url, { withFileTypes: true });
  const sources = await Promise.all(
    entries.map((entry) => {
      const child = new URL(entry.isDirectory() ? `${entry.name}/` : entry.name, url);
      return entry.isDirectory()
        ? readRuntimeSources(child)
        : /\.(?:js|jsx)$/.test(entry.name)
          ? readRuntimeSources(child)
          : [];
    }),
  );
  return sources.flat();
}

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

test('the browser gate creates a deliberate mismatch inside the Projects island', () => {
  const html =
    '<div data-hydrate-projects><section><h2>Published project case studies</h2><p data-project-results-status>Showing 3 of 3 projects.</p></section></div>';
  const fixture = createProjectsHydrationMismatchFixture(html);
  assert.match(fixture, /Projects hydration mismatch fixture/);
  assert.notEqual(fixture, html);
  assert.throws(
    () => createProjectsHydrationMismatchFixture('<main>Projects</main>'),
    /Projects island is missing/i,
  );
});

test('Projects uses one explicit hydrateRoot island with authoritative completion', async () => {
  const [clientEntry, hydrationEntry, explorer] = await Promise.all([
    readFile(new URL('../../src/entries/projects.client.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/entries/hydrateProjectsExplorer.jsx', import.meta.url), 'utf8'),
    readFile(
      new URL('../../src/components/portfolio-projects/ProjectsExplorer.jsx', import.meta.url),
      'utf8',
    ),
  ]);

  assert.match(clientEntry, /hydrateNavigation\('projects'\)/);
  assert.match(clientEntry, /hydrateProjectsExplorer\(\)/);
  assert.match(hydrationEntry, /hydrateRoot\s*\(/);
  assert.match(hydrationEntry, /onRecoverableError/);
  assert.match(explorer, /useEffect\s*\(\(\)\s*=>/);
  assert.match(explorer, /if \(onHydrated\?\.\(\) === false\) return undefined/);
  assert.match(hydrationEntry, /hydrationStatus === ['"]error['"]\) return false/);

  const runtime = `${clientEntry}\n${hydrationEntry}\n${explorer}`;
  assert.doesNotMatch(runtime, /\bcreateRoot\s*\(/);
  assert.doesNotMatch(runtime, /suppressHydrationWarning/);
  assert.doesNotMatch(runtime, /dangerouslySetInnerHTML/);
  assert.doesNotMatch(runtime, /document\.querySelector\(['"]#root['"]\)/);
});

test('Projects initial render does not read browser state before hydration commits', async () => {
  const explorer = await readFile(
    new URL('../../src/components/portfolio-projects/ProjectsExplorer.jsx', import.meta.url),
    'utf8',
  );
  const firstEffect = explorer.indexOf('useEffect(() => {');
  assert.ok(firstEffect > 0);
  assert.equal(explorer.slice(0, firstEffect).includes('window.'), false);
  assert.match(explorer.slice(firstEffect), /window\.location\.search/);
  assert.match(explorer.slice(firstEffect), /window\.addEventListener\(['"]popstate['"]/);
});

test('project subsections retain heading navigation without repeated named region landmarks', async () => {
  const article = await readFile(
    new URL('../../src/components/portfolio-projects/ProjectArticle.jsx', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(article, /<section\b[^>]*\baria-labelledby=/s);
  for (const headingMarkup of [
    '<h4 id={`${project.id}-summary`}>Problem and system approach</h4>',
    '<h4 id={`${project.id}-context`}>Implementation context and limits</h4>',
    '<h4 id={`${project.id}-evidence`}>Verified evidence</h4>',
  ]) {
    assert.ok(article.includes(headingMarkup), `Missing preserved project heading: ${headingMarkup}`);
  }
});

test('certification expansion is a static native disclosure with no hydration island', async () => {
  const [section, card, homePage, homeClient, global] = await Promise.all([
    readFile(new URL('../../src/components/sections/Certifications.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/components/content/CertificationCard.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/pages/HomePage.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/entries/home.client.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/styles/global.css', import.meta.url), 'utf8'),
  ]);

  assert.match(section, /<details[^>]*data-certification-disclosure/);
  assert.match(section, /<summary[^>]*>\s*View all certifications \(\{remainingCertifications\.length\} more\)/s);
  assert.match(section, /data-certification-list="featured"/);
  assert.match(section, /data-certification-list="remaining"/);
  assert.match(section, /start=\{featuredCertifications\.length \+ 1\}/);
  assert.match(card, /<h3>\{certification\.title\}<\/h3>/);
  assert.match(homePage, /selectRemainingCertifications\(certifications\)/);

  const runtime = `${section}\n${card}\n${homePage}\n${homeClient}`;
  assert.doesNotMatch(runtime, /data-hydrate-certification/i);
  assert.doesNotMatch(runtime, /\b(?:useState|useEffect|hydrateRoot|createRoot)\s*\(/);
  assert.doesNotMatch(runtime, /onClick=|aria-expanded=|role=["'](?:button|dialog)["']/);
  assert.doesNotMatch(runtime, /modal|carousel|pagination/i);

  assert.match(global, /\.certification-disclosure__summary\s*\{[^}]*min-height:\s*var\(--target-min\)/s);
  assert.match(global, /\.certification-disclosure__summary:hover/);
  assert.match(global, /\.certification-grid--remaining/);
  assert.match(
    global,
    /\.certification-disclosure:not\(\[open\]\)\s*>\s*\.certification-grid--remaining\s*\{[^}]*display:\s*none/s,
  );
  assert.match(global, /:focus-visible/);
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

test('the clean redesign runtime never imports from the legacy capitalized Projects directory', async () => {
  const sources = (
    await Promise.all(
      CLEAN_RUNTIME_PATHS.map((path) => readRuntimeSources(new URL(path, import.meta.url))),
    )
  ).flat();
  const featuredProjectsSource = sources.find(([path]) =>
    path.endsWith('/components/sections/FeaturedProjects.jsx'),
  )?.[1];

  assert.ok(featuredProjectsSource, 'Expected the production FeaturedProjects source to be scanned');
  assert.match(
    featuredProjectsSource,
    /from ['"]\.\.\/portfolio-projects\/FeaturedProjectCard\.jsx['"]/,
  );

  for (const [path, source] of sources) {
    const importSpecifiers = [
      ...source.matchAll(/(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g),
    ].map((match) => match[1]);
    assert.equal(
      importSpecifiers.some((specifier) => specifier.split(/[\\/]/).includes('Projects')),
      false,
      `${path} imports from the tracked legacy Projects directory`,
    );
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
  assert.equal(global.match(/var\(--color-control-border\)/g)?.length, 4);
  assert.match(
    global,
    /\.site-nav__summary\s*\{[^}]*border:\s*1px solid var\(--color-control-border\)/s,
  );
  assert.match(
    global,
    /\.link-button--secondary\s*\{[^}]*border-color:\s*var\(--color-control-border\)/s,
  );
  assert.match(
    global,
    /\.home-contact-link\s*\{[^}]*border:\s*1px solid var\(--color-control-border\)/s,
  );
  assert.match(
    global,
    /\.certification-disclosure__summary\s*\{[^}]*border:\s*1px solid var\(--color-control-border\)/s,
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

test('the browser production gate retains metadata, 404 and same-origin request verification', async () => {
  const productionFunction = verifyBrowser.toString();
  const source = await readFile(new URL('../../scripts/verify-browser.mjs', import.meta.url), 'utf8');
  assert.match(productionFunction, /getPageMetadata\('home'\)/);
  assert.match(productionFunction, /getPageJsonLd\('projects'\)/);
  assert.match(productionFunction, /verifyNotFoundPage/);
  assert.match(source, /404-\$\{width\}\.png/);
  assert.match(source, /new URL\(requestUrl\)\.origin !== origin/);
  assert.match(source, /node_modules\/axe-core\/axe\.min\.js/);
  assert.match(source, /ACCESSIBILITY_SCENARIOS/);
});

test('routine browser verification is artifact-free and evidence stays in the private Milestone 8 boundary', () => {
  assert.equal(resolveQualityEvidenceDirectory({ argv: [], env: {} }), null);
  const approved = resolveQualityEvidenceDirectory({ argv: ['--evidence'], env: {} });
  assert.match(
    approved.replaceAll('\\', '/'),
    /\/private\/checkpoint-reports\/milestone-8-evidence$/,
  );
  assert.throws(
    () =>
      resolveQualityEvidenceDirectory({
        argv: ['--evidence'],
        env: { MILESTONE8_EVIDENCE_DIR: 'C:\\unapproved-evidence' },
      }),
    /Milestone 8 evidence must stay under its private evidence directory/,
  );
});

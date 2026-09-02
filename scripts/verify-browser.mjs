import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { profile } from '../src/data/profile.js';
import { certifications } from '../src/data/certifications.js';
import { projects } from '../src/data/projects.js';
import {
  selectFeaturedCertifications,
  selectFeaturedProjects,
  selectPublishedCertifications,
  selectPublishedProjects,
  selectRemainingCertifications,
} from '../src/data/selectors.js';
import { ALL_PROJECTS_CATEGORY, getAvailableProjectCategories } from '../src/utils/projectFilters.js';
import { getPageJsonLd, getPageMetadata } from './metadata/manifest.mjs';
import { HOME_SECTION_ORDER } from './verify-dist.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const distDirectory = resolve(repositoryRoot, 'dist');
const privateReportDirectory = resolve(repositoryRoot, 'private/checkpoint-reports');
const milestone8EvidenceDirectory = resolve(privateReportDirectory, 'milestone-8-evidence');
const quietWindowMilliseconds = 500;

function freezeScenarios(scenarios) {
  return Object.freeze(scenarios.map((scenario) => Object.freeze(scenario)));
}

export const ACCESSIBILITY_SCENARIOS = Object.freeze({
  hydrated: freezeScenarios([
    { id: 'mobile-320', width: 320, height: 900 },
    { id: 'mobile-360', width: 360, height: 900 },
    { id: 'mobile-390', width: 390, height: 900 },
    { id: 'mobile-landscape', width: 667, height: 375 },
    { id: 'tablet-768', width: 768, height: 1000 },
    { id: 'desktop-1024', width: 1024, height: 1000 },
    { id: 'desktop-1280', width: 1280, height: 1000 },
    { id: 'desktop-1440', width: 1440, height: 1000 },
    { id: 'desktop-1920', width: 1920, height: 1080 },
  ]),
  noJavaScript: freezeScenarios([
    { id: 'static-320', width: 320, height: 900 },
    { id: 'static-768', width: 768, height: 1000 },
    { id: 'static-1440', width: 1440, height: 1000 },
  ]),
  reflow: freezeScenarios([
    { id: 'layout-equivalent-200', width: 640, height: 900, equivalentZoomPercent: 200 },
    { id: 'layout-equivalent-400', width: 320, height: 900, equivalentZoomPercent: 400 },
  ]),
  textOnly: Object.freeze({ id: 'text-only-200', width: 1280, height: 1000, textScalePercent: 200 }),
  forcedColors: freezeScenarios([
    { id: 'forced-colors-mobile', width: 320, height: 900 },
    { id: 'forced-colors-desktop', width: 1440, height: 1000 },
  ]),
});

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.xml', 'application/xml; charset=utf-8'],
]);

function delay(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

export function rectanglesIntersect(first, second, tolerance = 0.75) {
  if (!first || !second) return false;
  const horizontalOverlap =
    Math.min(first.right, second.right) - Math.max(first.left, second.left);
  const verticalOverlap =
    Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
  return horizontalOverlap > tolerance && verticalOverlap > tolerance;
}

export function measureResponsiveAccessibilityState() {
  const tolerance = 0.75;
  const isVisible = (element) => {
    if (!element) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      rect.width > tolerance &&
      rect.height > tolerance
    );
  };
  const visibleContent = [
    ...document.querySelectorAll(
      '#root h1, #root h2, #root h3, #root p, #root li, #root a, #root button, #root summary',
    ),
  ].filter(isVisible);
  const clippedContentCount = visibleContent.filter((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const outsideViewport = rect.left < -1 || rect.right > innerWidth + 1;
    const clippedInlineContent =
      element.scrollWidth > element.clientWidth + 2 &&
      ['hidden', 'clip'].includes(style.overflowX);
    return outsideViewport || clippedInlineContent;
  }).length;
  const headerHeight =
    document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0;
  const anchorTargets = [
    ...document.querySelectorAll('main section[id], [data-project-article-id][id]'),
  ];

  return {
    horizontalOverflow:
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) >
      document.documentElement.clientWidth + 1,
    clippedContentCount,
    anchorsClearStickyHeader: anchorTargets.every(
      (target) =>
        Number.parseFloat(getComputedStyle(target).scrollMarginTop) + 1 >= headerHeight,
    ),
  };
}

const responsiveAccessibilityRuntimeSource =
  `const measureResponsiveAccessibilityState = ${measureResponsiveAccessibilityState.toString()};`;

function measureCertificationOverlapState() {
  const tolerance = 0.75;
  const toPlainRect = (rect) => ({
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  });
  const isVisible = (element) => {
    if (!element) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      rect.width > tolerance &&
      rect.height > tolerance
    );
  };
  const escapesBoundary = (rect, boundary) =>
    Boolean(boundary) &&
    (rect.left < boundary.left - tolerance ||
      rect.right > boundary.right + tolerance ||
      rect.top < boundary.top - tolerance ||
      rect.bottom > boundary.bottom + tolerance);

  const details = document.querySelector('[data-certification-disclosure]');
  const remainingList = details?.querySelector('[data-certification-list="remaining"]');
  const certificationSection = details?.closest('[data-home-section="certifications"]');
  const educationSection = document.querySelector('[data-home-section="education"]');
  const footer = document.querySelector('.site-footer');
  const remainingCards = [
    ...(remainingList?.querySelectorAll('[data-certification-id]') ?? []),
  ];
  const visibleCards = remainingCards.filter(isVisible);
  const remainingListRect = isVisible(remainingList)
    ? toPlainRect(remainingList.getBoundingClientRect())
    : null;
  const disclosureRect = details ? toPlainRect(details.getBoundingClientRect()) : null;
  const sectionRect = certificationSection
    ? toPlainRect(certificationSection.getBoundingClientRect())
    : null;
  const educationRect = educationSection
    ? toPlainRect(educationSection.getBoundingClientRect())
    : null;
  const footerRect = footer ? toPlainRect(footer.getBoundingClientRect()) : null;
  const visibleCardRects = visibleCards.map((card) => ({
    id: card.dataset.certificationId,
    rect: toPlainRect(card.getBoundingClientRect()),
  }));

  const remainingListIntersectsEducation = rectanglesIntersect(
    remainingListRect,
    educationRect,
    tolerance,
  );
  const remainingListIntersectsFooter = rectanglesIntersect(
    remainingListRect,
    footerRect,
    tolerance,
  );
  const visibleCardIntersectsEducation = visibleCardRects.some(({ rect }) =>
    rectanglesIntersect(rect, educationRect, tolerance),
  );
  const visibleCardIntersectsFooter = visibleCardRects.some(({ rect }) =>
    rectanglesIntersect(rect, footerRect, tolerance),
  );
  const visibleBoundaryOverlap = visibleCardRects.some(({ rect }) => {
    const escapes = escapesBoundary(rect, disclosureRect) || escapesBoundary(rect, sectionRect);
    const overlapsFollowingContent =
      rectanglesIntersect(rect, educationRect, tolerance) ||
      rectanglesIntersect(rect, footerRect, tolerance);
    return escapes && overlapsFollowingContent;
  });

  return {
    remainingListVisible: isVisible(remainingList),
    remainingListRect,
    visibleRemainingIds: visibleCardRects.map(({ id }) => id),
    visibleCardRects,
    educationRect,
    footerRect,
    remainingListIntersectsEducation,
    remainingListIntersectsFooter,
    visibleCardIntersectsEducation,
    visibleCardIntersectsFooter,
    visibleBoundaryOverlap,
  };
}

const certificationOverlapRuntimeSource = [
  `const rectanglesIntersect = ${rectanglesIntersect.toString()};`,
  `const measureCertificationOverlapState = ${measureCertificationOverlapState.toString()};`,
].join('\n');

export function resolveQualityEvidenceDirectory({ argv = process.argv, env = process.env } = {}) {
  const milestone8Requested =
    argv.includes('--evidence') || env.MILESTONE8_CAPTURE_EVIDENCE === '1';
  const legacyRequestedDirectory =
    env.MILESTONE7_PREVIEW_DIR ??
    env.MILESTONE5_PREVIEW_DIR ??
    env.MILESTONE4_PREVIEW_DIR;
  if (!milestone8Requested && !legacyRequestedDirectory) return null;

  const requestedDirectory = milestone8Requested
    ? env.MILESTONE8_EVIDENCE_DIR ?? milestone8EvidenceDirectory
    : legacyRequestedDirectory;

  const directory = resolve(requestedDirectory);
  if (
    milestone8Requested &&
    directory !== milestone8EvidenceDirectory &&
    !directory.startsWith(`${milestone8EvidenceDirectory}${sep}`)
  ) {
    throw new Error('Milestone 8 evidence must stay under its private evidence directory.');
  }
  if (
    directory !== privateReportDirectory &&
    !directory.startsWith(`${privateReportDirectory}${sep}`)
  ) {
    throw new Error('Preview output must stay under private/checkpoint-reports.');
  }

  return directory;
}

async function preparePreviewDirectory() {
  const directory = resolveQualityEvidenceDirectory();
  if (!directory) return null;
  await mkdir(directory, { recursive: true });
  return directory;
}

async function firstAccessible(paths) {
  for (const path of paths.filter(Boolean)) {
    try {
      await access(path);
      return path;
    } catch {
      // Continue through the curated browser locations.
    }
  }
  throw new Error('No supported Chromium browser was found for hydration verification.');
}

async function findBrowserExecutable() {
  if (process.env.BROWSER_PATH) return firstAccessible([process.env.BROWSER_PATH]);
  if (process.platform === 'win32') {
    return firstAccessible([
      resolve(process.env.PROGRAMFILES ?? '', 'Microsoft/Edge/Application/msedge.exe'),
      resolve(process.env['PROGRAMFILES(X86)'] ?? '', 'Microsoft/Edge/Application/msedge.exe'),
      resolve(process.env.LOCALAPPDATA ?? '', 'Microsoft/Edge/Application/msedge.exe'),
      resolve(process.env.PROGRAMFILES ?? '', 'Google/Chrome/Application/chrome.exe'),
      resolve(process.env['PROGRAMFILES(X86)'] ?? '', 'Google/Chrome/Application/chrome.exe'),
      resolve(process.env.LOCALAPPDATA ?? '', 'Google/Chrome/Application/chrome.exe'),
    ]);
  }
  if (process.platform === 'darwin') {
    return firstAccessible([
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ]);
  }
  return firstAccessible([
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/microsoft-edge',
  ]);
}

export function createHydrationMismatchFixture(html) {
  const islandStart = html.indexOf('data-hydrate-navigation');
  const islandEnd = html.indexOf('</nav>', islandStart);
  if (islandStart === -1 || islandEnd === -1) {
    throw new Error('Cannot create mismatch fixture: navigation island is missing.');
  }
  const island = html.slice(islandStart, islandEnd);
  const changedIsland = island.replace(
    />Capabilities<\/a>/,
    '>Hydration mismatch fixture</a>',
  );
  if (changedIsland === island) {
    throw new Error('Cannot create mismatch fixture: Capabilities link is missing.');
  }
  return `${html.slice(0, islandStart)}${changedIsland}${html.slice(islandEnd)}`;
}

export function createProjectsHydrationMismatchFixture(html) {
  const islandStart = html.indexOf('data-hydrate-projects');
  const islandEnd = html.indexOf('data-project-results-status', islandStart);
  if (islandStart === -1 || islandEnd === -1) {
    throw new Error('Cannot create mismatch fixture: Projects island is missing.');
  }
  const island = html.slice(islandStart, islandEnd);
  const changedIsland = island.replace(
    'Published project case studies',
    'Projects hydration mismatch fixture',
  );
  if (changedIsland === island) {
    throw new Error('Cannot create mismatch fixture: Projects heading is missing.');
  }
  return `${html.slice(0, islandStart)}${changedIsland}${html.slice(islandEnd)}`;
}

async function startStaticServer() {
  const homeHtml = await readFile(resolve(distDirectory, 'index.html'), 'utf8');
  const projectsHtml = await readFile(resolve(distDirectory, 'projects/index.html'), 'utf8');
  const mismatchHtml = createHydrationMismatchFixture(homeHtml);
  const projectsMismatchHtml = createProjectsHydrationMismatchFixture(projectsHtml);
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      if (url.pathname === '/__mismatch/') {
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        response.end(mismatchHtml);
        return;
      }
      if (url.pathname === '/__mismatch/projects/') {
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        response.end(projectsMismatchHtml);
        return;
      }
      if (url.pathname === '/favicon.ico') {
        response.writeHead(204).end();
        return;
      }
      const relativePath =
        url.pathname === '/'
          ? 'index.html'
          : url.pathname === '/projects/'
            ? 'projects/index.html'
            : decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const file = resolve(distDirectory, relativePath);
      if (file !== distDirectory && !file.startsWith(`${distDirectory}${sep}`)) {
        response.writeHead(400).end('Invalid path');
        return;
      }
      const content = await readFile(file);
      response.writeHead(200, {
        'content-type': contentTypes.get(extname(file).toLowerCase()) ?? 'application/octet-stream',
      });
      response.end(content);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
  await new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolvePromise);
  });
  const address = server.address();
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolvePromise) => server.close(resolvePromise)),
  };
}

class DevToolsConnection {
  constructor(webSocketUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.socket = new WebSocket(webSocketUrl);
    this.ready = new Promise((resolvePromise, reject) => {
      this.socket.addEventListener('open', resolvePromise, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      for (const listener of this.listeners.get(message.method) ?? []) listener(message);
    });
  }

  async send(method, params = {}, sessionId) {
    await this.ready;
    const id = this.nextId++;
    const result = new Promise((resolvePromise, reject) => {
      this.pending.set(id, { resolve: resolvePromise, reject });
    });
    this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return result;
  }

  once(method, sessionId, timeoutMilliseconds = 10_000) {
    return new Promise((resolvePromise, reject) => {
      const listeners = this.listeners.get(method) ?? new Set();
      const timeout = setTimeout(() => {
        listeners.delete(listener);
        reject(new Error(`Timed out waiting for ${method}.`));
      }, timeoutMilliseconds);
      const listener = (message) => {
        if (sessionId && message.sessionId !== sessionId) return;
        clearTimeout(timeout);
        listeners.delete(listener);
        resolvePromise(message.params);
      };
      listeners.add(listener);
      this.listeners.set(method, listeners);
    });
  }

  close() {
    this.socket.close();
  }
}

async function waitForDevTools(portFile) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const [port] = (await readFile(portFile, 'utf8')).trim().split(/\r?\n/);
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return response.json();
    } catch {
      await delay(100);
    }
  }
  throw new Error('Chromium DevTools did not become available.');
}

async function evaluate(connection, sessionId, expression) {
  const result = await connection.send(
    'Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true },
    sessionId,
  );
  if (result.exceptionDetails) throw new Error('Browser verification expression failed.');
  return result.result.value;
}

const AXE_IMPACTS = new Set(['minor', 'moderate', 'serious', 'critical']);

export function summarizeAxeResults(results) {
  if (!results || !Array.isArray(results.violations)) {
    throw new Error('malformed-axe-results');
  }
  return results.violations.map((violation) => {
    if (
      !violation ||
      typeof violation.id !== 'string' ||
      !violation.id ||
      !AXE_IMPACTS.has(violation.impact) ||
      !Array.isArray(violation.nodes)
    ) {
      throw new Error('malformed-axe-results');
    }
    return {
      id: violation.id,
      impact: violation.impact,
      nodeCount: violation.nodes.length,
    };
  });
}

async function verifyAxeState(
  connection,
  origin,
  axeSource,
  { id, path, width, height, openCertifications = false, projectFilter = null },
) {
  const { targetId } = await connection.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await connection.send('Target.attachToTarget', { targetId, flatten: true });
  const requests = [];
  const requestListener = (message) => {
    if (message.sessionId === sessionId) requests.push(message.params.request.url);
  };
  const requestListeners = connection.listeners.get('Network.requestWillBeSent') ?? new Set();
  requestListeners.add(requestListener);
  connection.listeners.set('Network.requestWillBeSent', requestListeners);
  try {
    await connection.send('Runtime.enable', {}, sessionId);
    await connection.send('Page.enable', {}, sessionId);
    await connection.send('Network.enable', {}, sessionId);
    await connection.send(
      'Emulation.setDeviceMetricsOverride',
      { width, height, deviceScaleFactor: 1, mobile: width < 768 },
      sessionId,
    );
    const loaded = connection.once('Page.loadEventFired', sessionId);
    await connection.send('Page.navigate', { url: `${origin}${path}` }, sessionId);
    await loaded;
    if (path !== '/404.html') {
      await evaluate(
        connection,
        sessionId,
        `(async () => {
          const deadline = Date.now() + 10000;
          while (Date.now() < deadline) {
            const statuses = [...document.querySelectorAll('[data-hydration-status]')]
              .map((element) => element.dataset.hydrationStatus);
            if (statuses.length > 0 && statuses.every((status) => status === 'complete')) return;
            await new Promise((resolve) => setTimeout(resolve, 25));
          }
          throw new Error('Timed out before axe verification.');
        })()`,
      );
    }
    if (openCertifications) {
      await evaluate(
        connection,
        sessionId,
        `document.querySelector('[data-certification-disclosure]').open = true`,
      );
    }
    if (projectFilter) {
      await evaluate(
        connection,
        sessionId,
        `(async () => {
          document.querySelector('[data-project-filter=${JSON.stringify(projectFilter)}]').click();
          const deadline = Date.now() + 5000;
          while (Date.now() < deadline) {
            if (document.querySelector('[data-project-filter][aria-pressed="true"]')?.dataset.projectFilter === ${JSON.stringify(projectFilter)}) return;
            await new Promise((resolve) => setTimeout(resolve, 25));
          }
          throw new Error('Timed out selecting the axe project state.');
        })()`,
      );
    }
    const injection = await connection.send(
      'Runtime.evaluate',
      { expression: axeSource, awaitPromise: true, returnByValue: false },
      sessionId,
    );
    if (injection.exceptionDetails) throw new Error('Local axe injection failed.');
    const safeResults = await evaluate(
      connection,
      sessionId,
      `(async () => {
        if (!globalThis.axe || typeof globalThis.axe.run !== 'function') {
          throw new Error('axe is unavailable');
        }
        const results = await globalThis.axe.run(document, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']
          }
        });
        return {
          violations: results.violations.map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            nodes: Array.from({ length: violation.nodes.length }, () => null)
          }))
        };
      })()`,
    );
    const violations = summarizeAxeResults(safeResults);
    const blocking = violations.filter(({ impact }) => impact === 'critical' || impact === 'serious');
    if (blocking.length > 0) {
      throw new Error(
        `axe-blocking-violations: ${blocking.map(({ id, nodeCount }) => `${id}:${nodeCount}`).join(',')}`,
      );
    }
    if (requests.some((requestUrl) => new URL(requestUrl).origin !== origin)) {
      throw new Error(`axe state ${id} made an external request.`);
    }
    return { id, path, width, violations };
  } finally {
    requestListeners.delete(requestListener);
    await connection.send('Target.closeTarget', { targetId });
  }
}

async function verifyPage(
  connection,
  origin,
  {
    path,
    expectedHeading,
    expectedFeaturedCertificationIds = [],
    expectedFeaturedProjectIds = [],
    expectedHomeContacts = [],
    expectedHomeSections = [],
    expectedNavigationHrefs,
    expectedProjectArticleIds = [],
    expectedProjectArtifactHrefs = [],
    expectedProjectControlsHidden = null,
    expectedProjectFilters = [],
    expectedPublishedCertificationIds = [],
    expectedRemainingCertificationIds = [],
    expectedMetadata,
    expectedJsonLd,
    javaScriptEnabled,
    forcedColors = false,
    height = null,
    reducedMotion = false,
    screenshotFile = null,
    textScalePercent = 100,
    width = 320,
  },
) {
  const { targetId } = await connection.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await connection.send('Target.attachToTarget', { targetId, flatten: true });
  const errors = [];
  const networkRequests = [];
  const networkFailures = [];
  const recordRuntimeError = (message) => {
    if (message.sessionId === sessionId) errors.push(message.method);
  };
  const runtimeListeners = connection.listeners.get('Runtime.exceptionThrown') ?? new Set();
  runtimeListeners.add(recordRuntimeError);
  connection.listeners.set('Runtime.exceptionThrown', runtimeListeners);
  const logListener = (message) => {
    if (message.sessionId === sessionId && message.params.entry.level === 'error') {
      errors.push(`Log.entryAdded:${message.params.entry.source}`);
    }
  };
  const logListeners = connection.listeners.get('Log.entryAdded') ?? new Set();
  logListeners.add(logListener);
  connection.listeners.set('Log.entryAdded', logListeners);
  const consoleListener = (message) => {
    if (message.sessionId === sessionId && message.params.type === 'error') errors.push('console.error');
  };
  const consoleListeners = connection.listeners.get('Runtime.consoleAPICalled') ?? new Set();
  consoleListeners.add(consoleListener);
  connection.listeners.set('Runtime.consoleAPICalled', consoleListeners);
  const requestListener = (message) => {
    if (message.sessionId === sessionId) networkRequests.push(message.params.request.url);
  };
  const requestListeners = connection.listeners.get('Network.requestWillBeSent') ?? new Set();
  requestListeners.add(requestListener);
  connection.listeners.set('Network.requestWillBeSent', requestListeners);
  const responseListener = (message) => {
    if (message.sessionId === sessionId && message.params.response.status >= 400) {
      networkFailures.push(message.params.response.status);
    }
  };
  const responseListeners = connection.listeners.get('Network.responseReceived') ?? new Set();
  responseListeners.add(responseListener);
  connection.listeners.set('Network.responseReceived', responseListeners);

  await connection.send('Runtime.enable', {}, sessionId);
  await connection.send('Page.enable', {}, sessionId);
  await connection.send('Log.enable', {}, sessionId);
  await connection.send('Network.enable', {}, sessionId);
  await connection.send(
    'Emulation.setDeviceMetricsOverride',
    {
      width,
      height: height ?? (width < 768 ? 900 : 1000),
      deviceScaleFactor: 1,
      mobile: width < 768,
    },
    sessionId,
  );
  await connection.send(
    'Emulation.setEmulatedMedia',
    {
      media: 'screen',
      features: [
        {
          name: 'prefers-reduced-motion',
          value: reducedMotion ? 'reduce' : 'no-preference',
        },
        ...(forcedColors ? [{ name: 'forced-colors', value: 'active' }] : []),
      ],
    },
    sessionId,
  );
  if (!javaScriptEnabled) {
    await connection.send('Emulation.setScriptExecutionDisabled', { value: true }, sessionId);
  }
  const loaded = connection.once('Page.loadEventFired', sessionId);
  await connection.send('Page.navigate', { url: `${origin}${path}` }, sessionId);
  await loaded;

  if (javaScriptEnabled) {
    await evaluate(
      connection,
      sessionId,
      `(async () => {
        const deadline = Date.now() + 10000;
        while (Date.now() < deadline) {
          const statuses = [...document.querySelectorAll('[data-hydration-status]')]
            .map((element) => element.dataset.hydrationStatus);
          if (statuses.length > 0 && statuses.every((status) => status === 'complete' || status === 'error')) break;
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
        await new Promise((resolve) => setTimeout(resolve, ${quietWindowMilliseconds}));
      })()`,
    );
  }

  if (textScalePercent !== 100) {
    await evaluate(
      connection,
      sessionId,
      `(() => {
        const style = document.createElement('style');
        style.dataset.qualityTextScale = 'true';
        style.textContent = ':root { font-size: ${textScalePercent}% !important; }';
        document.head.append(style);
        document.documentElement.getBoundingClientRect();
      })()`,
    );
    await delay(25);
  }

  const initialCertificationState = await evaluate(
    connection,
    sessionId,
    `(() => {
      const details = document.querySelector('[data-certification-disclosure]');
      const isVisible = (element) => {
        if (!element) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const featured = [...document.querySelectorAll('[data-certification-list="featured"] [data-certification-id]')];
      const remaining = [...document.querySelectorAll('[data-certification-list="remaining"] [data-certification-id]')];
      return {
        applicable: Boolean(details),
        open: details?.open ?? null,
        order: [...document.querySelectorAll('[data-certification-id]')]
          .map((article) => article.dataset.certificationId),
        featuredVisibleCount: featured.filter(isVisible).length,
        remainingHiddenCount: remaining.filter((article) => !isVisible(article)).length
      };
    })()`,
  );

  const networkRequestCountBeforeInteraction = networkRequests.length;
  const interaction = await evaluate(
    connection,
    sessionId,
    `(async () => {
      const details = document.querySelector('.site-nav__disclosure');
      const summary = document.querySelector('.site-nav__summary');
      const firstLink = details?.querySelector('a[href]');
      const summaryVisible = summary && getComputedStyle(summary).display !== 'none';
      const result = {
        summaryVisible: Boolean(summaryVisible),
        nativeDisclosureOpened: null,
        nativeDisclosureClosed: null,
        escapeClosed: null,
        escapeReturnedFocus: null,
        linkActivationClosed: null,
        linkActivationReturnedFocus: null,
        certificationPointerOpened: null,
        certificationPointerClosed: null
      };

      if (summaryVisible && details && firstLink) {
        details.open = false;
        summary.click();
        result.nativeDisclosureOpened = details.open;

        if (${javaScriptEnabled}) {
          firstLink.focus();
          firstLink.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          await new Promise((resolve) => setTimeout(resolve, 0));
          result.escapeClosed = !details.open;
          result.escapeReturnedFocus = document.activeElement === summary;

          details.open = true;
          firstLink.focus();
          firstLink.addEventListener('click', (event) => event.preventDefault(), { once: true });
          firstLink.click();
          await new Promise((resolve) => setTimeout(resolve, 0));
          result.linkActivationClosed = !details.open;
          result.linkActivationReturnedFocus = document.activeElement === summary;
        } else {
          summary.click();
          result.nativeDisclosureClosed = !details.open;
        }
      }

      const certificationDetails = document.querySelector('[data-certification-disclosure]');
      const certificationSummary = certificationDetails?.querySelector(':scope > summary');
      if (certificationDetails && certificationSummary) {
        certificationDetails.open = false;
        certificationSummary.click();
        result.certificationPointerOpened = certificationDetails.open;
        certificationSummary.click();
        result.certificationPointerClosed = !certificationDetails.open;
      }

      return result;
    })()`,
  );
  await delay(25);

  const certificationKeyboard = {
    applicable: expectedPublishedCertificationIds.length > 0,
    enterOpened: null,
    enterClosed: null,
    spaceOpened: null,
    spaceClosed: null,
    tabReached: null,
    focusOutlineWidth: null,
    focusOutlineStyle: null,
    focusOutlineOffset: null,
    focusRetained: null,
  };
  if (certificationKeyboard.applicable) {
    const pressKey = async (key, code, virtualKeyCode) => {
      await connection.send(
        'Input.dispatchKeyEvent',
        {
          type: 'keyDown',
          key,
          code,
          windowsVirtualKeyCode: virtualKeyCode,
          nativeVirtualKeyCode: virtualKeyCode,
          ...(key === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}),
          ...(key === ' ' ? { text: ' ', unmodifiedText: ' ' } : {}),
        },
        sessionId,
      );
      await connection.send(
        'Input.dispatchKeyEvent',
        { type: 'keyUp', key, code, windowsVirtualKeyCode: virtualKeyCode, nativeVirtualKeyCode: virtualKeyCode },
        sessionId,
      );
      await delay(25);
      return evaluate(
        connection,
        sessionId,
        `(() => {
          const details = document.querySelector('[data-certification-disclosure]');
          const summary = details?.querySelector(':scope > summary');
          return { open: Boolean(details?.open), focused: document.activeElement === summary };
        })()`,
      );
    };
    await evaluate(
      connection,
      sessionId,
      `(() => {
        const details = document.querySelector('[data-certification-disclosure]');
        const summary = details?.querySelector(':scope > summary');
        if (!details || !summary) return false;
        details.open = false;
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        return true;
      })()`,
    );
    for (let index = 0; index < 80; index += 1) {
      const tabState = await pressKey('Tab', 'Tab', 9);
      if (tabState.focused) {
        certificationKeyboard.tabReached = true;
        break;
      }
    }
    certificationKeyboard.tabReached ??= false;
    if (certificationKeyboard.tabReached) {
      const tabFocus = await evaluate(
        connection,
        sessionId,
        `(() => {
          const summary = document.querySelector('[data-certification-disclosure] > summary');
          const style = summary ? getComputedStyle(summary) : null;
          return {
            width: style?.outlineWidth ?? null,
            style: style?.outlineStyle ?? null,
            offset: style?.outlineOffset ?? null
          };
        })()`,
      );
      certificationKeyboard.focusOutlineWidth = tabFocus.width;
      certificationKeyboard.focusOutlineStyle = tabFocus.style;
      certificationKeyboard.focusOutlineOffset = tabFocus.offset;
    }
    const enterOpen = await pressKey('Enter', 'Enter', 13);
    const enterClose = await pressKey('Enter', 'Enter', 13);
    const spaceOpen = await pressKey(' ', 'Space', 32);
    const spaceClose = await pressKey(' ', 'Space', 32);
    certificationKeyboard.enterOpened = enterOpen.open;
    certificationKeyboard.enterClosed = !enterClose.open;
    certificationKeyboard.spaceOpened = spaceOpen.open;
    certificationKeyboard.spaceClosed = !spaceClose.open;
    certificationKeyboard.focusRetained = [enterOpen, enterClose, spaceOpen, spaceClose].every(
      ({ focused }) => focused,
    );
  }

  const certificationLayout = await evaluate(
    connection,
    sessionId,
    `(() => {
      ${certificationOverlapRuntimeSource}
      const details = document.querySelector('[data-certification-disclosure]');
      const summary = details?.querySelector(':scope > summary');
      if (!details || !summary) return { applicable: false };

      const isVisible = (element) => {
        if (!element) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const featured = [...document.querySelectorAll('[data-certification-list="featured"] [data-certification-id]')];
      const remaining = [...document.querySelectorAll('[data-certification-list="remaining"] [data-certification-id]')];
      const expectedLongTitleIds = new Set([
        'microsoft-azure-ai-apps-agents-developer-associate',
        'google-connect-protect-networks-network-security',
        'nvidia-building-transformer-based-nlp-applications'
      ]);

      details.open = false;
      summary.click();
      details.getBoundingClientRect();

      const overlapMeasurement = measureCertificationOverlapState();
      const titleMeasurements = [...document.querySelectorAll('[data-certification-id]')]
        .filter((article) => expectedLongTitleIds.has(article.dataset.certificationId))
        .map((article) => {
          const title = article.querySelector('h3');
          const titleRect = title.getBoundingClientRect();
          const cardRect = article.getBoundingClientRect();
          const style = getComputedStyle(title);
          return {
            id: article.dataset.certificationId,
            clientWidth: title.clientWidth,
            scrollWidth: title.scrollWidth,
            fitsCardHorizontally:
              titleRect.left >= cardRect.left - 1 && titleRect.right <= cardRect.right + 1,
            overflowX: style.overflowX,
            overflowY: style.overflowY,
            overflowWrap: style.overflowWrap,
            whiteSpace: style.whiteSpace,
            webkitLineClamp: style.webkitLineClamp
          };
        });
      const openState = {
        open: details.open,
        order: [...document.querySelectorAll('[data-certification-id]')]
          .map((article) => article.dataset.certificationId),
        featuredVisibleCount: featured.filter(isVisible).length,
        remainingVisibleCount: remaining.filter(isVisible).length,
        horizontalOverflow:
          Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) >
          document.documentElement.clientWidth + 1,
        overlapsNextSection:
          overlapMeasurement.remainingListIntersectsEducation ||
          overlapMeasurement.visibleCardIntersectsEducation,
        overlapsFooter:
          overlapMeasurement.remainingListIntersectsFooter ||
          overlapMeasurement.visibleCardIntersectsFooter,
        overlapMeasurement,
        titleMeasurements
      };

      summary.click();
      details.getBoundingClientRect();
      return {
        applicable: true,
        openState,
        closed: !details.open,
        remainingHiddenCount: remaining.filter((article) => !isVisible(article)).length,
        focusRetained: document.activeElement === summary
      };
    })()`,
  );
  await delay(25);
  const certificationInteractionRequestDelta =
    networkRequests.length - networkRequestCountBeforeInteraction;

  const snapshot = await evaluate(
    connection,
    sessionId,
    `(() => {
      ${responsiveAccessibilityRuntimeSource}
      const skipLink = document.querySelector('.skip-link');
      const primaryNav = document.querySelector('nav[aria-label="Primary"]');
      const summary = document.querySelector('.site-nav__summary');
      const summaryRect = summary?.getBoundingClientRect();
      const certificationDisclosure = document.querySelector('[data-certification-disclosure]');
      const certificationSummary = certificationDisclosure?.querySelector(':scope > summary');
      const certificationSummaryRect = certificationSummary?.getBoundingClientRect();
      const certificationFocusStyle = certificationSummary ? getComputedStyle(certificationSummary) : null;
      const contactTypes = [...document.querySelectorAll('[data-contact-kind]')]
        .map((link) => link.dataset.contactKind);
      const homeContacts = [...document.querySelectorAll('[data-home-contact-kind]')]
        .map((link) => ({
          kind: link.dataset.homeContactKind,
          href: link.getAttribute('href')
        }));
      const isVisible = (element) => {
        if (!element) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const primaryLinks = [
        ...(primaryNav?.querySelectorAll(
          isVisible(summary) ? '[data-mobile-nav-links] a[href]' : '[data-desktop-nav-links] a[href]',
        ) ?? []),
      ];
      const practicalPointerTargets = [
        ...document.querySelectorAll(
          '.site-identity, .site-nav__summary, .site-nav__link, .link-button, .home-contact-link, .footer-nav a, .footer-contact-link, .certification-disclosure__summary, [data-project-filter], [data-project-empty-state] button',
        ),
      ].filter(isVisible);
      const essentialText = [
        ...document.querySelectorAll(
          'body, .site-identity__role, .site-nav__link, .site-footer__label, .footer-contact-link',
        ),
      ].filter(isVisible);
      skipLink?.focus({ preventScroll: true });
      const focusStyle = skipLink ? getComputedStyle(skipLink) : null;
      const firstUsefulTarget = document.querySelector(
        'a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
      );
      const reducedTransition = getComputedStyle(document.querySelector('.link-button')).transitionDuration;
      const flowCandidates = [
        ...document.querySelectorAll('[data-home-section], [data-project-article-id], footer.site-footer'),
      ].filter(
        (candidate, _index, candidates) =>
          isVisible(candidate) &&
          !candidates.some((other) => other !== candidate && other.contains(candidate)),
      );
      const flowRects = flowCandidates.map((element) => element.getBoundingClientRect());
      const flowCollisionCount = flowRects.slice(1).filter(
        (rect, index) => rect.top < flowRects[index].bottom - 1,
      ).length;
      const responsiveAccessibility = measureResponsiveAccessibilityState();

      return {
        viewportWidth: innerWidth,
        heading: document.querySelector('h1')?.textContent.trim(),
        h1Count: document.querySelectorAll('h1').length,
        skipLinkCount: document.querySelectorAll('a.skip-link[href="#main"]').length,
        firstUsefulIsSkipLink: firstUsefulTarget === skipLink,
        headerCount: document.querySelectorAll('header.site-header').length,
        mainCount: document.querySelectorAll('main#main').length,
        primaryNavCount: document.querySelectorAll('nav[aria-label="Primary"]').length,
        detailsCount: document.querySelectorAll('details.site-nav__disclosure').length,
        summaryCount: document.querySelectorAll('summary.site-nav__summary').length,
        footerCount: document.querySelectorAll('footer.site-footer').length,
        contactTypes,
        homeContacts,
        homeSections: [...document.querySelectorAll('[data-home-section]')]
          .map((section) => section.dataset.homeSection),
        featuredProjectIds: [...document.querySelectorAll('[data-featured-project-id]')]
          .map((article) => article.dataset.featuredProjectId),
        certificationIds: [...document.querySelectorAll('[data-certification-id]')]
          .map((article) => article.dataset.certificationId),
        featuredCertificationIds: [...document.querySelectorAll('[data-certification-list="featured"] [data-certification-id]')]
          .map((article) => article.dataset.certificationId),
        remainingCertificationIds: [...document.querySelectorAll('[data-certification-list="remaining"] [data-certification-id]')]
          .map((article) => article.dataset.certificationId),
        certificationDisclosureCount: document.querySelectorAll('[data-certification-disclosure]').length,
        certificationSummaryCount: document.querySelectorAll('[data-certification-disclosure] > summary').length,
        certificationSummaryText: certificationSummary?.textContent.trim() ?? null,
        certificationDisclosureOpen: certificationDisclosure?.open ?? null,
        certificationSummaryTargetIsMinimum:
          !isVisible(certificationSummary) ||
          (certificationSummaryRect.width >= 44 && certificationSummaryRect.height >= 44),
        certificationFocusOutlineWidth: certificationFocusStyle?.outlineWidth ?? null,
        certificationFocusOutlineStyle: certificationFocusStyle?.outlineStyle ?? null,
        certificationFocusOutlineOffset: certificationFocusStyle?.outlineOffset ?? null,
        certificationInteractiveControlCount: document.querySelectorAll(
          '[data-certification-id] a, [data-certification-id] button, [data-certification-id] input, [data-certification-id] select, [data-certification-id] textarea',
        ).length,
        certificationImageCount: document.querySelectorAll('[data-certification-id] img').length,
        certificationHeadingCount: document.querySelectorAll('[data-certification-id] h3').length,
        featuredCertificationsVisible: [...document.querySelectorAll('[data-certification-list="featured"] [data-certification-id]')]
          .every(isVisible),
        remainingCertificationsHidden: [...document.querySelectorAll('[data-certification-list="remaining"] [data-certification-id]')]
          .every((article) => !isVisible(article)),
        projectsPlaceholderCount: document.querySelectorAll('[data-projects-placeholder]').length,
        projectArticleIds: [...document.querySelectorAll('[data-project-article-id]')]
          .map((article) => article.dataset.projectArticleId),
        projectArtifactHrefs: [...document.querySelectorAll('[data-project-article-id] [data-project-artifacts] a[href]')]
          .map((link) => link.getAttribute('href')),
        projectImageCount: document.querySelectorAll('[data-project-article-id] img').length,
        projectFilters: [...document.querySelectorAll('[data-project-filter]')]
          .map((button) => ({
            category: button.dataset.projectFilter,
            pressed: button.getAttribute('aria-pressed')
          })),
        projectFilterControlsHidden: document.querySelector('[data-project-filter-controls]')?.hidden ?? null,
        projectResultStatus: document.querySelector('[data-project-results-status]')?.textContent.trim() ?? null,
        primaryNavigationHrefs: primaryLinks.map((link) => link.getAttribute('href')),
        primaryNavigationVisible: primaryLinks.every(isVisible),
        summaryVisible: isVisible(summary),
        summaryTargetIsMinimum: !isVisible(summary) || (summaryRect.width >= 44 && summaryRect.height >= 44),
        practicalPointerTargetsMeetMinimum: practicalPointerTargets.every((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width >= 44 && rect.height >= 44;
        }),
        essentialTextIsMinimum: essentialText.every(
          (element) => Number.parseFloat(getComputedStyle(element).fontSize) >= 14,
        ),
        focusOutlineWidth: focusStyle?.outlineWidth,
        focusOutlineStyle: focusStyle?.outlineStyle,
        focusOutlineOffset: focusStyle?.outlineOffset,
        stickyHeader: getComputedStyle(document.querySelector('.site-header')).position === 'sticky',
        reducedMotionApplied:
          getComputedStyle(document.documentElement).scrollBehavior === 'auto' &&
          reducedTransition.split(',').every((duration) => duration.trim() === '0s'),
        forcedColorsApplied:
          !${forcedColors} || matchMedia('(forced-colors: active)').matches,
        textScalePercent: ${textScalePercent},
        clippedContentCount: responsiveAccessibility.clippedContentCount,
        flowCollisionCount,
        anchorsClearStickyHeader: responsiveAccessibility.anchorsClearStickyHeader,
        horizontalOverflow: responsiveAccessibility.horizontalOverflow,
        hydrationStatus: document.querySelector('[data-hydrate-navigation]')?.dataset.hydrationStatus,
        projectsHydrationStatus: document.querySelector('[data-hydrate-projects]')?.dataset.hydrationStatus ?? null,
        hydrationStatuses: [...document.querySelectorAll('[data-hydration-status]')]
          .map((element) => element.dataset.hydrationStatus),
        coreTextLength: document.querySelector('#root')?.innerText.trim().length ?? 0,
        metadata: {
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.content ?? null,
          canonical: document.querySelector('link[rel="canonical"]')?.href ?? null,
          favicon: document.querySelector('link[rel="icon"]')?.getAttribute('href') ?? null,
          appleIcon: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href') ?? null,
          appleSizes: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('sizes') ?? null,
          og: Object.fromEntries([...document.querySelectorAll('meta[property^="og:"]')].map((tag) => [tag.getAttribute('property'), tag.content])),
          twitter: Object.fromEntries([...document.querySelectorAll('meta[name^="twitter:"]')].map((tag) => [tag.getAttribute('name'), tag.content])),
          jsonLdCount: document.querySelectorAll('script[type="application/ld+json"]').length,
          jsonLd: (() => {
            const script = document.querySelector('script[type="application/ld+json"]');
            return script ? JSON.parse(script.textContent) : null;
          })()
        }
      };
    })()`,
  );

  if (screenshotFile) {
    await evaluate(
      connection,
      sessionId,
      `(() => {
        const details = document.querySelector('.site-nav__disclosure');
        if (details) details.open = false;
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      })()`,
    );
    const screenshot = await connection.send(
      'Page.captureScreenshot',
      { format: 'png', captureBeyondViewport: true, fromSurface: true },
      sessionId,
    );
    await writeFile(screenshotFile, Buffer.from(screenshot.data, 'base64'));
  }

  await connection.send('Target.closeTarget', { targetId });
  runtimeListeners.delete(recordRuntimeError);
  logListeners.delete(logListener);
  consoleListeners.delete(consoleListener);
  requestListeners.delete(requestListener);
  responseListeners.delete(responseListener);
  if (
    snapshot.heading !== expectedHeading ||
    snapshot.h1Count !== 1 ||
    snapshot.skipLinkCount !== 1 ||
    !snapshot.firstUsefulIsSkipLink ||
    snapshot.headerCount !== 1 ||
    snapshot.mainCount !== 1 ||
    snapshot.primaryNavCount !== 1 ||
    snapshot.footerCount !== 1
  ) {
    throw new Error(`${path} at ${width}px is missing its required accessible shell landmarks.`);
  }
  const interfaceFailures = [
    [snapshot.detailsCount !== 1, 'details-count'],
    [snapshot.summaryCount !== 1, 'summary-count'],
    [snapshot.coreTextLength < 20, 'core-text'],
    [snapshot.horizontalOverflow, 'horizontal-overflow'],
    [snapshot.clippedContentCount !== 0, 'content-clipping'],
    [snapshot.flowCollisionCount !== 0, 'flow-collision'],
    [!snapshot.anchorsClearStickyHeader, 'anchor-clearance'],
    [!snapshot.stickyHeader, 'sticky-header'],
    [!snapshot.summaryTargetIsMinimum, 'summary-target'],
    [!snapshot.practicalPointerTargetsMeetMinimum, 'practical-pointer-targets'],
    [!snapshot.essentialTextIsMinimum, 'essential-text-size'],
    [snapshot.focusOutlineWidth !== '3px', 'focus-width'],
    [snapshot.focusOutlineStyle !== 'solid', 'focus-style'],
    [snapshot.focusOutlineOffset !== '3px', 'focus-offset'],
  ]
    .filter(([failed]) => failed)
    .map(([, rule]) => rule);
  if (interfaceFailures.length > 0) {
    throw new Error(
      `${path} at ${width}px failed interface rules: ${interfaceFailures.join(', ')}.`,
    );
  }
  if (JSON.stringify(snapshot.primaryNavigationHrefs) !== JSON.stringify(expectedNavigationHrefs)) {
    throw new Error(`${path} at ${width}px has an unexpected primary navigation contract.`);
  }
  if (JSON.stringify(snapshot.contactTypes) !== JSON.stringify(['email', 'linkedin', 'github'])) {
    throw new Error(`${path} at ${width}px does not contain exactly the three approved contact types.`);
  }
  if (JSON.stringify(snapshot.homeSections) !== JSON.stringify(expectedHomeSections)) {
    throw new Error(`${path} at ${width}px has an unexpected static homepage section order.`);
  }
  if (
    JSON.stringify(snapshot.featuredProjectIds) !== JSON.stringify(expectedFeaturedProjectIds)
  ) {
    throw new Error(`${path} at ${width}px has an unexpected published flagship set or order.`);
  }
  if (JSON.stringify(snapshot.homeContacts) !== JSON.stringify(expectedHomeContacts)) {
    throw new Error(`${path} at ${width}px has an unexpected homepage contact contract.`);
  }
  if (expectedPublishedCertificationIds.length > 0) {
    const titleMeasurements = certificationLayout.openState?.titleMeasurements ?? [];
    const titlesWrapWithoutClipping =
      titleMeasurements.length === 3 &&
      titleMeasurements.every(
        (measurement) =>
          measurement.fitsCardHorizontally &&
          measurement.scrollWidth <= measurement.clientWidth + 3 &&
          measurement.overflowX === 'visible' &&
          measurement.overflowY === 'visible' &&
          measurement.overflowWrap !== 'normal' &&
          !['nowrap', 'pre'].includes(measurement.whiteSpace) &&
          ['none', ''].includes(measurement.webkitLineClamp),
      );
    const certificationFailures = [
      [!initialCertificationState.applicable, 'initial-disclosure-missing'],
      [initialCertificationState.open !== false, 'initial-closed-state'],
      [
        JSON.stringify(initialCertificationState.order) !==
          JSON.stringify(expectedPublishedCertificationIds),
        'initial-published-order',
      ],
      [initialCertificationState.featuredVisibleCount !== 3, 'initial-featured-visibility'],
      [initialCertificationState.remainingHiddenCount !== 8, 'initial-remaining-visibility'],
      [
        JSON.stringify(snapshot.certificationIds) !==
          JSON.stringify(expectedPublishedCertificationIds),
        'published-order',
      ],
      [
        JSON.stringify(snapshot.featuredCertificationIds) !==
          JSON.stringify(expectedFeaturedCertificationIds),
        'featured-order',
      ],
      [
        JSON.stringify(snapshot.remainingCertificationIds) !==
          JSON.stringify(expectedRemainingCertificationIds),
        'remaining-order',
      ],
      [snapshot.certificationDisclosureCount !== 1, 'details-count'],
      [snapshot.certificationSummaryCount !== 1, 'summary-count'],
      [snapshot.certificationSummaryText !== 'View all certifications (8 more)', 'summary-text'],
      [snapshot.certificationDisclosureOpen !== false, 'initial-closed-state'],
      [!snapshot.certificationSummaryTargetIsMinimum, 'summary-target'],
      [certificationKeyboard.focusOutlineWidth !== '3px', 'focus-width'],
      [certificationKeyboard.focusOutlineStyle !== 'solid', 'focus-style'],
      [certificationKeyboard.focusOutlineOffset !== '3px', 'focus-offset'],
      [snapshot.certificationInteractiveControlCount !== 0, 'credential-controls'],
      [snapshot.certificationImageCount !== 0, 'credential-images'],
      [snapshot.certificationHeadingCount !== expectedPublishedCertificationIds.length, 'card-headings'],
      [!snapshot.featuredCertificationsVisible, 'featured-visibility'],
      [!snapshot.remainingCertificationsHidden, 'remaining-initial-visibility'],
      [!certificationLayout.applicable, 'open-layout-missing'],
      [certificationLayout.openState?.open !== true, 'open-layout-state'],
      [certificationLayout.openState?.featuredVisibleCount !== 3, 'open-featured-visibility'],
      [certificationLayout.openState?.remainingVisibleCount !== 8, 'open-remaining-visibility'],
      [
        !certificationLayout.openState?.overlapMeasurement?.remainingListVisible,
        'open-remaining-list-visibility',
      ],
      [
        JSON.stringify(certificationLayout.openState?.overlapMeasurement?.visibleRemainingIds) !==
          JSON.stringify(expectedRemainingCertificationIds),
        'open-visible-card-order',
      ],
      [
        certificationLayout.openState?.overlapMeasurement?.visibleCardRects?.length !== 8,
        'open-visible-card-rectangles',
      ],
      [
        JSON.stringify(certificationLayout.openState?.order) !==
          JSON.stringify(expectedPublishedCertificationIds),
        'open-published-order',
      ],
      [certificationLayout.openState?.horizontalOverflow !== false, 'open-horizontal-overflow'],
      [
        certificationLayout.openState?.overlapMeasurement?.remainingListIntersectsEducation !==
          false,
        'open-list-education-overlap',
      ],
      [
        certificationLayout.openState?.overlapMeasurement?.visibleCardIntersectsEducation !==
          false,
        'open-card-education-overlap',
      ],
      [
        certificationLayout.openState?.overlapMeasurement?.remainingListIntersectsFooter !== false,
        'open-list-footer-overlap',
      ],
      [
        certificationLayout.openState?.overlapMeasurement?.visibleCardIntersectsFooter !== false,
        'open-card-footer-overlap',
      ],
      [
        certificationLayout.openState?.overlapMeasurement?.visibleBoundaryOverlap !== false,
        'open-card-boundary-overlap',
      ],
      [certificationLayout.openState?.overlapsNextSection !== false, 'open-next-section-overlap'],
      [certificationLayout.openState?.overlapsFooter !== false, 'open-footer-overlap'],
      [!titlesWrapWithoutClipping, 'open-title-wrapping'],
      [!certificationLayout.closed, 'layout-close-state'],
      [certificationLayout.remainingHiddenCount !== 8, 'layout-close-visibility'],
      [!certificationLayout.focusRetained, 'layout-close-focus'],
      [certificationInteractionRequestDelta !== 0, 'interaction-network-request'],
      [!interaction.certificationPointerOpened, 'pointer-open'],
      [!interaction.certificationPointerClosed, 'pointer-close'],
      [!certificationKeyboard.enterOpened, 'enter-open'],
      [!certificationKeyboard.enterClosed, 'enter-close'],
      [!certificationKeyboard.spaceOpened, 'space-open'],
      [!certificationKeyboard.spaceClosed, 'space-close'],
      [!certificationKeyboard.tabReached, 'tab-reach'],
      [!certificationKeyboard.focusRetained, 'keyboard-focus'],
    ]
      .filter(([failed]) => failed)
      .map(([, rule]) => rule);
    if (certificationFailures.length > 0) {
      throw new Error(
        `${path} at ${width}px failed certification disclosure rules: ${certificationFailures.join(', ')} (focus: ${snapshot.certificationFocusOutlineWidth}/${snapshot.certificationFocusOutlineStyle}/${snapshot.certificationFocusOutlineOffset}; keyboard: ${JSON.stringify(certificationKeyboard)}).`,
      );
    }
  }
  if (snapshot.projectsPlaceholderCount !== 0) {
    throw new Error(`${path} at ${width}px retains the obsolete Projects placeholder.`);
  }
  if (JSON.stringify(snapshot.projectArticleIds) !== JSON.stringify(expectedProjectArticleIds)) {
    throw new Error(`${path} at ${width}px has an unexpected published project set or order.`);
  }
  if (
    JSON.stringify(snapshot.projectArtifactHrefs) !== JSON.stringify(expectedProjectArtifactHrefs) ||
    snapshot.projectImageCount !== 0
  ) {
    throw new Error(`${path} at ${width}px has an unexpected project artifact or image placeholder.`);
  }
  if (
    JSON.stringify(snapshot.projectFilters.map(({ category }) => category)) !==
    JSON.stringify(expectedProjectFilters)
  ) {
    throw new Error(`${path} at ${width}px has an unexpected useful project-filter set.`);
  }
  if (expectedProjectFilters.length > 0) {
    const expectedHidden = expectedProjectControlsHidden ?? !javaScriptEnabled;
    if (snapshot.projectFilterControlsHidden !== expectedHidden) {
      throw new Error(`${path} at ${width}px has an unsafe pre-enhancement filter state.`);
    }
    if (
      snapshot.projectFilters[0]?.category !== ALL_PROJECTS_CATEGORY ||
      snapshot.projectFilters[0]?.pressed !== 'true' ||
      snapshot.projectFilters.slice(1).some(({ pressed }) => pressed !== 'false')
    ) {
      throw new Error(`${path} at ${width}px does not preserve the default All filter state.`);
    }
  }
  if (snapshot.summaryVisible) {
    if (!interaction.nativeDisclosureOpened) {
      throw new Error(`${path} at ${width}px cannot open its native navigation disclosure.`);
    }
    if (javaScriptEnabled) {
      if (
        !interaction.escapeClosed ||
        !interaction.escapeReturnedFocus ||
        !interaction.linkActivationClosed ||
        !interaction.linkActivationReturnedFocus
      ) {
        throw new Error(`${path} at ${width}px failed enhanced disclosure keyboard/focus behavior.`);
      }
    } else if (!interaction.nativeDisclosureClosed) {
      throw new Error(`${path} at ${width}px cannot close its no-JavaScript native disclosure.`);
    }
  } else if (!snapshot.primaryNavigationVisible) {
    throw new Error(`${path} at ${width}px hides its desktop primary navigation.`);
  }
  if (reducedMotion && !snapshot.reducedMotionApplied) {
    throw new Error(`${path} at ${width}px did not apply the reduced-motion contract.`);
  }
  if (forcedColors && !snapshot.forcedColorsApplied) {
    throw new Error(`${path} at ${width}px did not apply forced-colours emulation.`);
  }
  const expectedMetadataSnapshot = {
    title: expectedMetadata.title,
    description: expectedMetadata.description,
    canonical: expectedMetadata.canonicalUrl,
    favicon: '/favicon.svg',
    appleIcon: '/apple-touch-icon.png',
    appleSizes: '180x180',
    og: {
      'og:type': 'website',
      'og:url': expectedMetadata.canonicalUrl,
      'og:title': expectedMetadata.title,
      'og:description': expectedMetadata.description,
      'og:image': expectedMetadata.socialImageUrl,
      'og:image:width': '1200',
      'og:image:height': '630',
      'og:image:alt': expectedMetadata.socialImageAlt,
    },
    twitter: {
      'twitter:card': 'summary_large_image',
      'twitter:title': expectedMetadata.title,
      'twitter:description': expectedMetadata.description,
      'twitter:image': expectedMetadata.socialImageUrl,
      'twitter:image:alt': expectedMetadata.socialImageAlt,
    },
    jsonLdCount: 1,
    jsonLd: expectedJsonLd,
  };
  if (JSON.stringify(snapshot.metadata) !== JSON.stringify(expectedMetadataSnapshot)) {
    throw new Error(`${path} at ${width}px has an unexpected metadata or JSON-LD contract.`);
  }
  if (
    networkFailures.length > 0 ||
    networkRequests.some((requestUrl) => new URL(requestUrl).origin !== origin)
  ) {
    throw new Error(`${path} at ${width}px made an external or failed network request.`);
  }
  return {
    ...snapshot,
    interaction,
    certificationKeyboard,
    certificationLayout,
    certificationInteractionRequestDelta,
    errors,
    networkRequestCount: networkRequests.length,
    screenshotFile,
  };
}

async function verifyResponsiveAccessibilityRegression(connection, origin) {
  const { targetId } = await connection.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await connection.send('Target.attachToTarget', {
    targetId,
    flatten: true,
  });
  try {
    await connection.send('Runtime.enable', {}, sessionId);
    await connection.send('Page.enable', {}, sessionId);
    await connection.send(
      'Emulation.setDeviceMetricsOverride',
      { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false },
      sessionId,
    );
    const loaded = connection.once('Page.loadEventFired', sessionId);
    await connection.send('Page.navigate', { url: `${origin}/` }, sessionId);
    await loaded;
    await evaluate(
      connection,
      sessionId,
      `(async () => {
        const deadline = Date.now() + 10000;
        while (Date.now() < deadline) {
          const statuses = [...document.querySelectorAll('[data-hydration-status]')]
            .map((element) => element.dataset.hydrationStatus);
          if (statuses.length > 0 && statuses.every((status) => status === 'complete')) return;
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
        throw new Error('Timed out before responsive accessibility regression verification.');
      })()`,
    );

    const result = await evaluate(
      connection,
      sessionId,
      `(() => {
        ${responsiveAccessibilityRuntimeSource}
        const root = document.querySelector('#root');
        const anchor = document.querySelector('main section[id]');
        if (!root || !anchor) return { applicable: false };

        const forceLayout = () => document.documentElement.getBoundingClientRect();
        const baseline = measureResponsiveAccessibilityState();
        const horizontalFixture = document.createElement('div');
        const clippingFixture = document.createElement('p');
        const anchorFixture = document.createElement('style');
        let horizontal;
        let clipping;
        let anchorClearance;
        try {
          horizontalFixture.dataset.qualityResponsiveRegression = 'horizontal-overflow';
          horizontalFixture.setAttribute('aria-hidden', 'true');
          horizontalFixture.style.cssText =
            'width: calc(100vw + 64px); height: 1px; margin: 0; padding: 0;';
          document.body.append(horizontalFixture);
          forceLayout();
          horizontal = measureResponsiveAccessibilityState();
          horizontalFixture.remove();
          forceLayout();

          clippingFixture.dataset.qualityResponsiveRegression = 'content-clipping';
          clippingFixture.setAttribute('aria-hidden', 'true');
          clippingFixture.textContent = 'Responsive detector regression sentinel';
          clippingFixture.style.cssText =
            'width: 1px; max-width: 1px; height: 1.5em; overflow-x: hidden; white-space: nowrap;';
          root.append(clippingFixture);
          forceLayout();
          clipping = measureResponsiveAccessibilityState();
          clippingFixture.remove();
          forceLayout();

          anchorFixture.dataset.qualityResponsiveRegression = 'anchor-clearance';
          anchorFixture.textContent =
            'main section[id] { scroll-margin-block-start: 0 !important; }';
          document.head.append(anchorFixture);
          forceLayout();
          anchorClearance = measureResponsiveAccessibilityState();
        } finally {
          horizontalFixture.remove();
          clippingFixture.remove();
          anchorFixture.remove();
          forceLayout();
        }
        const restored = measureResponsiveAccessibilityState();
        const fixturesRemoved =
          !horizontalFixture.isConnected &&
          !clippingFixture.isConnected &&
          !anchorFixture.isConnected &&
          !document.querySelector('[data-quality-responsive-regression]');

        return {
          applicable: true,
          baseline,
          horizontal,
          clipping,
          anchorClearance,
          restored,
          fixturesRemoved,
          cleanupRestored: fixturesRemoved
        };
      })()`,
    );

    const isClean = (measurement) =>
      Boolean(
        measurement &&
          !measurement.horizontalOverflow &&
          measurement.clippedContentCount === 0 &&
          measurement.anchorsClearStickyHeader,
      );
    const failures = [
      [!result.applicable, 'fixture-missing'],
      [!isClean(result.baseline), 'baseline-not-clean'],
      [!result.horizontal?.horizontalOverflow, 'horizontal-overflow-undetected'],
      [
        result.clipping?.clippedContentCount <= result.baseline?.clippedContentCount,
        'content-clipping-undetected',
      ],
      [result.anchorClearance?.anchorsClearStickyHeader !== false, 'anchor-clearance-undetected'],
      [!isClean(result.restored), 'restored-state-not-clean'],
      [!result.fixturesRemoved, 'fixture-cleanup-not-restored'],
    ]
      .filter(([failed]) => failed)
      .map(([, rule]) => rule);
    if (failures.length > 0) {
      throw new Error(
        `Responsive accessibility detector negative regression failed: ${failures.join(', ')}.`,
      );
    }

    return {
      status: 'detected-and-restored',
      horizontalOverflowDetected: true,
      contentClippingDetected: true,
      anchorClearanceDetected: true,
      cleanupRestored: true,
    };
  } finally {
    await connection.send('Target.closeTarget', { targetId });
  }
}

async function verifyCertificationOverlapRegression(connection, origin) {
  const { targetId } = await connection.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await connection.send('Target.attachToTarget', {
    targetId,
    flatten: true,
  });
  try {
    await connection.send('Runtime.enable', {}, sessionId);
    await connection.send('Page.enable', {}, sessionId);
    await connection.send(
      'Emulation.setDeviceMetricsOverride',
      { width: 320, height: 900, deviceScaleFactor: 1, mobile: true },
      sessionId,
    );
    const loaded = connection.once('Page.loadEventFired', sessionId);
    await connection.send('Page.navigate', { url: `${origin}/` }, sessionId);
    await loaded;

    const result = await evaluate(
      connection,
      sessionId,
      `(() => {
        ${certificationOverlapRuntimeSource}
        const details = document.querySelector('[data-certification-disclosure]');
        const remainingList = details?.querySelector('[data-certification-list="remaining"]');
        const firstRemainingCard = remainingList?.querySelector('[data-certification-id]');
        const education = document.querySelector('[data-home-section="education"]');
        const footer = document.querySelector('.site-footer');
        if (!details || !remainingList || !firstRemainingCard || !education || !footer) {
          return { applicable: false };
        }

        const originalListTransform = remainingList.style.transform;
        const originalCardTransform = firstRemainingCard.style.transform;
        const restoreTransform = (element, value) => {
          if (value) element.style.transform = value;
          else element.style.removeProperty('transform');
        };
        const translateInto = (element, target) => {
          element.style.removeProperty('transform');
          const sourceRect = element.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          const inset = Math.max(
            2,
            Math.min(8, targetRect.width / 4, targetRect.height / 4),
          );
          const translateX = targetRect.left + inset - sourceRect.left;
          const translateY = targetRect.top + inset - sourceRect.top;
          element.style.transform =
            'translate(' + translateX + 'px, ' + translateY + 'px)';
          element.getBoundingClientRect();
          return measureCertificationOverlapState();
        };

        details.open = true;
        details.getBoundingClientRect();
        const clean = measureCertificationOverlapState();
        let listEducation;
        let cardEducation;
        let listFooter;
        let cardFooter;
        try {
          listEducation = translateInto(remainingList, education);
          restoreTransform(remainingList, originalListTransform);
          remainingList.getBoundingClientRect();

          cardEducation = translateInto(firstRemainingCard, education);
          restoreTransform(firstRemainingCard, originalCardTransform);
          firstRemainingCard.getBoundingClientRect();

          listFooter = translateInto(remainingList, footer);
          restoreTransform(remainingList, originalListTransform);
          remainingList.getBoundingClientRect();

          cardFooter = translateInto(firstRemainingCard, footer);
        } finally {
          restoreTransform(remainingList, originalListTransform);
          restoreTransform(firstRemainingCard, originalCardTransform);
          remainingList.getBoundingClientRect();
        }
        const restored = measureCertificationOverlapState();
        details.open = false;

        return {
          applicable: true,
          clean,
          listEducation,
          cardEducation,
          listFooter,
          cardFooter,
          restored,
          cleanupRestored:
            remainingList.style.transform === originalListTransform &&
            firstRemainingCard.style.transform === originalCardTransform &&
            !details.open
        };
      })()`,
    );

    const hasEducationOverlap = (measurement) =>
      Boolean(
        measurement &&
          (measurement.remainingListIntersectsEducation ||
            measurement.visibleCardIntersectsEducation),
      );
    const hasFooterOverlap = (measurement) =>
      Boolean(
        measurement &&
          (measurement.remainingListIntersectsFooter ||
            measurement.visibleCardIntersectsFooter),
      );
    const hasAnyOverlap = (measurement) =>
      Boolean(
        measurement &&
          (hasEducationOverlap(measurement) ||
            hasFooterOverlap(measurement) ||
            measurement.visibleBoundaryOverlap),
      );
    const failures = [
      [!result.applicable, 'fixture-missing'],
      [result.clean?.visibleRemainingIds?.length !== 8, 'clean-visible-count'],
      [hasAnyOverlap(result.clean), 'clean-overlap'],
      [!result.listEducation?.remainingListIntersectsEducation, 'list-education-undetected'],
      [!result.listEducation?.visibleCardIntersectsEducation, 'list-card-education-undetected'],
      [!result.cardEducation?.visibleCardIntersectsEducation, 'card-education-undetected'],
      [!result.cardEducation?.visibleBoundaryOverlap, 'card-education-boundary-undetected'],
      [!result.listFooter?.remainingListIntersectsFooter, 'list-footer-undetected'],
      [!result.listFooter?.visibleCardIntersectsFooter, 'list-card-footer-undetected'],
      [!result.cardFooter?.visibleCardIntersectsFooter, 'card-footer-undetected'],
      [!result.cardFooter?.visibleBoundaryOverlap, 'card-footer-boundary-undetected'],
      [hasAnyOverlap(result.restored), 'restored-overlap'],
      [!result.cleanupRestored, 'cleanup-not-restored'],
    ]
      .filter(([failed]) => failed)
      .map(([, rule]) => rule);
    if (failures.length > 0) {
      throw new Error(
        `Certification overlap detector negative regression failed: ${failures.join(', ')}.`,
      );
    }

    return {
      status: 'detected-and-restored',
      cleanOverlap: false,
      listEducationDetected: true,
      cardEducationDetected: true,
      listFooterDetected: true,
      cardFooterDetected: true,
      cleanupRestored: true,
    };
  } finally {
    await connection.send('Target.closeTarget', { targetId });
  }
}

async function verifyProjectsBehavior(connection, origin) {
  const { targetId } = await connection.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await connection.send('Target.attachToTarget', { targetId, flatten: true });
  const errors = [];
  const runtimeListener = (message) => {
    if (message.sessionId === sessionId) errors.push(message.method);
  };
  const consoleListener = (message) => {
    if (message.sessionId === sessionId && message.params.type === 'error') errors.push('console.error');
  };
  const runtimeListeners = connection.listeners.get('Runtime.exceptionThrown') ?? new Set();
  const consoleListeners = connection.listeners.get('Runtime.consoleAPICalled') ?? new Set();
  runtimeListeners.add(runtimeListener);
  consoleListeners.add(consoleListener);
  connection.listeners.set('Runtime.exceptionThrown', runtimeListeners);
  connection.listeners.set('Runtime.consoleAPICalled', consoleListeners);

  await connection.send('Runtime.enable', {}, sessionId);
  await connection.send('Page.enable', {}, sessionId);
  await connection.send(
    'Emulation.setDeviceMetricsOverride',
    { width: 768, height: 1000, deviceScaleFactor: 1, mobile: false },
    sessionId,
  );

  async function waitForProjects(category) {
    await evaluate(
      connection,
      sessionId,
      `(async () => {
        const deadline = Date.now() + 10000;
        while (Date.now() < deadline) {
          const statuses = [...document.querySelectorAll('[data-hydration-status]')]
            .map((element) => element.dataset.hydrationStatus);
          const selected = document.querySelector('[data-project-filter][aria-pressed="true"]')
            ?.dataset.projectFilter;
          if (statuses.length === 2 && statuses.every((status) => status === 'complete') && selected === ${JSON.stringify(category)}) return;
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
        throw new Error('Timed out waiting for Projects state.');
      })()`,
    );
  }

  async function navigate(path, category = ALL_PROJECTS_CATEGORY) {
    const loaded = connection.once('Page.loadEventFired', sessionId);
    await connection.send('Page.navigate', { url: `${origin}${path}` }, sessionId);
    await loaded;
    await waitForProjects(category);
  }

  async function reload(category = ALL_PROJECTS_CATEGORY) {
    const loaded = connection.once('Page.loadEventFired', sessionId);
    await connection.send('Page.reload', { ignoreCache: true }, sessionId);
    await loaded;
    await waitForProjects(category);
  }

  async function snapshot() {
    return evaluate(
      connection,
      sessionId,
      `(() => ({
        href: location.pathname + location.search + location.hash,
        selected: document.querySelector('[data-project-filter][aria-pressed="true"]')?.dataset.projectFilter,
        visibleIds: [...document.querySelectorAll('[data-project-article-id]')]
          .map((article) => article.dataset.projectArticleId),
        status: document.querySelector('[data-project-results-status]')?.textContent.trim(),
        live: document.querySelector('[data-project-results-status]')?.getAttribute('aria-live'),
        controlsHidden: document.querySelector('[data-project-filter-controls]')?.hidden,
        focusedFilter: document.activeElement?.dataset?.projectFilter ?? null,
        hydrationStatuses: [...document.querySelectorAll('[data-hydration-status]')]
          .map((element) => element.dataset.hydrationStatus),
        articleCount: document.querySelectorAll('[data-project-article-id]').length,
        artifactCount: document.querySelectorAll('[data-project-article-id] [data-project-artifacts] a[href]').length,
        targetPosition: (() => {
          const target = document.querySelector(':target');
          const header = document.querySelector('.site-header');
          if (!target || !header) return null;
          return { top: target.getBoundingClientRect().top, headerBottom: header.getBoundingClientRect().bottom };
        })()
      }))()`,
    );
  }

  function assertState(actual, { category, href, ids }) {
    if (
      actual.selected !== category ||
      actual.href !== href ||
      JSON.stringify(actual.visibleIds) !== JSON.stringify(ids) ||
      actual.status !== `Showing ${ids.length} of 3 projects.` ||
      actual.live !== 'polite' ||
      actual.controlsHidden !== false ||
      !actual.hydrationStatuses.every((status) => status === 'complete')
    ) {
      throw new Error(`Projects behavior contract failed for ${href}.`);
    }
  }

  const publishedIds = selectPublishedProjects(projects).map((project) => project.id);
  const airQualityId = 'european-air-quality-evidence-agent';
  const metaMindId = 'metamind-responsible-ai-learning-companion';

  try {
    await navigate('/projects/?category=agentic-ai', 'agentic-ai');
    assertState(await snapshot(), {
      category: 'agentic-ai',
      href: '/projects/?category=agentic-ai',
      ids: [airQualityId, metaMindId],
    });
    await reload('agentic-ai');
    assertState(await snapshot(), {
      category: 'agentic-ai',
      href: '/projects/?category=agentic-ai',
      ids: [airQualityId, metaMindId],
    });

    await evaluate(
      connection,
      sessionId,
      `document.querySelector('[data-project-filter="mcp"]').focus()`,
    );
    await connection.send(
      'Input.dispatchKeyEvent',
      { type: 'keyDown', key: ' ', code: 'Space' },
      sessionId,
    );
    await connection.send(
      'Input.dispatchKeyEvent',
      { type: 'keyUp', key: ' ', code: 'Space' },
      sessionId,
    );
    await waitForProjects('mcp');
    const keyboardState = await snapshot();
    assertState(keyboardState, {
      category: 'mcp',
      href: '/projects/?category=mcp',
      ids: [airQualityId],
    });
    if (keyboardState.focusedFilter !== 'mcp') {
      throw new Error('Project filtering did not retain keyboard focus on the activated button.');
    }

    await evaluate(
      connection,
      sessionId,
      `document.querySelector('[data-project-filter="responsible-ai"]').click()`,
    );
    await waitForProjects('responsible-ai');
    assertState(await snapshot(), {
      category: 'responsible-ai',
      href: '/projects/?category=responsible-ai',
      ids: [airQualityId, metaMindId],
    });

    await evaluate(connection, sessionId, 'history.back()');
    await waitForProjects('mcp');
    assertState(await snapshot(), {
      category: 'mcp',
      href: '/projects/?category=mcp',
      ids: [airQualityId],
    });
    await evaluate(connection, sessionId, 'history.forward()');
    await waitForProjects('responsible-ai');
    assertState(await snapshot(), {
      category: 'responsible-ai',
      href: '/projects/?category=responsible-ai',
      ids: [airQualityId, metaMindId],
    });

    for (const invalidPath of [
      '/projects/?category=computer-vision',
      '/projects/?category=unknown',
      '/projects/?category=',
      '/projects/?category=agentic-ai&category=mcp',
      '/projects/?category=%E0%A4%A',
      '/projects/?category=agentic-ai&source=test',
    ]) {
      await navigate(invalidPath);
      assertState(await snapshot(), {
        category: ALL_PROJECTS_CATEGORY,
        href: '/projects/',
        ids: publishedIds,
      });
    }

    await navigate(`/projects/?category=applied-research#${airQualityId}`);
    const deepState = await snapshot();
    assertState(deepState, {
      category: ALL_PROJECTS_CATEGORY,
      href: `/projects/#${airQualityId}`,
      ids: publishedIds,
    });
    if (
      !deepState.targetPosition ||
      deepState.targetPosition.top + 1 < deepState.targetPosition.headerBottom
    ) {
      throw new Error('The direct project fragment is obscured by the sticky header.');
    }
    await reload();
    assertState(await snapshot(), {
      category: ALL_PROJECTS_CATEGORY,
      href: `/projects/#${airQualityId}`,
      ids: publishedIds,
    });

    await navigate('/projects/');
    const allState = await snapshot();
    assertState(allState, {
      category: ALL_PROJECTS_CATEGORY,
      href: '/projects/',
      ids: publishedIds,
    });
    if (allState.articleCount !== 3 || allState.artifactCount !== 2) {
      throw new Error('Projects direct load does not expose the complete approved collection and artifacts.');
    }
    await reload();
    assertState(await snapshot(), {
      category: ALL_PROJECTS_CATEGORY,
      href: '/projects/',
      ids: publishedIds,
    });

    if (errors.length > 0) {
      throw new Error(`Projects interactions emitted browser errors: ${errors.join(', ')}.`);
    }
    return {
      validQuery: true,
      keyboardAndFocus: true,
      history: true,
      invalidQueryFallbacks: 6,
      deepFragment: true,
      directLoadAndRefresh: true,
      publishedIds,
    };
  } finally {
    await connection.send('Target.closeTarget', { targetId });
    runtimeListeners.delete(runtimeListener);
    consoleListeners.delete(consoleListener);
  }
}

async function verifyNotFoundPage(connection, origin, previewDirectory, width) {
  const { targetId } = await connection.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await connection.send('Target.attachToTarget', { targetId, flatten: true });
  const requests = [];
  const failures = [];
  const requestListener = (message) => {
    if (message.sessionId === sessionId) requests.push(message.params.request.url);
  };
  const responseListener = (message) => {
    if (message.sessionId === sessionId && message.params.response.status >= 400) {
      failures.push(message.params.response.status);
    }
  };
  const requestListeners = connection.listeners.get('Network.requestWillBeSent') ?? new Set();
  const responseListeners = connection.listeners.get('Network.responseReceived') ?? new Set();
  requestListeners.add(requestListener);
  responseListeners.add(responseListener);
  connection.listeners.set('Network.requestWillBeSent', requestListeners);
  connection.listeners.set('Network.responseReceived', responseListeners);
  try {
    await connection.send('Runtime.enable', {}, sessionId);
    await connection.send('Page.enable', {}, sessionId);
    await connection.send('Network.enable', {}, sessionId);
    await connection.send(
      'Emulation.setDeviceMetricsOverride',
      { width, height: width === 320 ? 900 : 1000, deviceScaleFactor: 1, mobile: width === 320 },
      sessionId,
    );
    const loaded = connection.once('Page.loadEventFired', sessionId);
    await connection.send('Page.navigate', { url: `${origin}/404.html` }, sessionId);
    await loaded;
    await delay(quietWindowMilliseconds);
    const snapshot = await evaluate(
      connection,
      sessionId,
      `(() => {
        const links = [...document.querySelectorAll('a[href]')];
        const actionable = links.filter((link) => {
          const rect = link.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        const focusTarget = document.querySelector('a.primary-link');
        focusTarget?.focus({ preventScroll: true });
        const focusStyle = focusTarget ? getComputedStyle(focusTarget) : null;
        return {
          title: document.title,
          language: document.documentElement.lang,
          noindexCount: document.querySelectorAll('meta[name="robots"][content="noindex"]').length,
          mainCount: document.querySelectorAll('main#main').length,
          h1Count: document.querySelectorAll('h1').length,
          heading: document.querySelector('h1')?.textContent.trim(),
          text: document.body.innerText.trim(),
          hrefs: links.map((link) => link.getAttribute('href')),
          scriptCount: document.querySelectorAll('script').length,
          formCount: document.querySelectorAll('form').length,
          canonicalCount: document.querySelectorAll('link[rel="canonical"]').length,
          jsonLdCount: document.querySelectorAll('script[type="application/ld+json"]').length,
          targetMinimum: actionable.every((link) => {
            const rect = link.getBoundingClientRect();
            return rect.width >= 44 && rect.height >= 44;
          }),
          focusWidth: focusStyle?.outlineWidth,
          focusStyle: focusStyle?.outlineStyle,
          focusOffset: focusStyle?.outlineOffset,
          horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > document.documentElement.clientWidth + 1
        };
      })()`,
    );
    const expectedText = [
      'Ahmed Aziz Ben Aissa',
      'AI Systems Engineer',
      '404',
      'Page not found',
      'The page you requested does not exist or may have moved.',
      'Return home',
      'View projects',
    ];
    if (
      snapshot.title !== 'Page Not Found — Ahmed Aziz Ben Aissa' ||
      snapshot.language !== 'en' ||
      snapshot.noindexCount !== 1 ||
      snapshot.mainCount !== 1 ||
      snapshot.h1Count !== 1 ||
      snapshot.heading !== 'Page not found' ||
      expectedText.some((value) => !snapshot.text.includes(value)) ||
      JSON.stringify(snapshot.hrefs) !== JSON.stringify(['/', '/', '/projects/']) ||
      snapshot.scriptCount !== 0 ||
      snapshot.formCount !== 0 ||
      snapshot.canonicalCount !== 0 ||
      snapshot.jsonLdCount !== 0 ||
      !snapshot.targetMinimum ||
      snapshot.focusWidth !== '3px' ||
      snapshot.focusStyle !== 'solid' ||
      snapshot.focusOffset !== '3px' ||
      snapshot.horizontalOverflow
    ) {
      throw new Error(`404.html at ${width}px failed its standalone accessibility contract.`);
    }
    if (
      failures.length > 0 ||
      requests.some((requestUrl) => new URL(requestUrl).origin !== origin)
    ) {
      throw new Error(`404.html at ${width}px made an external or failed network request.`);
    }
    const screenshotFile = previewDirectory
      ? resolve(previewDirectory, `404-${width}.png`)
      : null;
    if (screenshotFile) {
      const screenshot = await connection.send(
        'Page.captureScreenshot',
        { format: 'png', captureBeyondViewport: true, fromSurface: true },
        sessionId,
      );
      await writeFile(screenshotFile, Buffer.from(screenshot.data, 'base64'));
    }
    return {
      path: '/404.html',
      width,
      status: 'standalone',
      horizontalOverflow: false,
      networkRequestCount: requests.length,
      screenshot: screenshotFile,
    };
  } finally {
    requestListeners.delete(requestListener);
    responseListeners.delete(responseListener);
    await connection.send('Target.closeTarget', { targetId });
  }
}

export async function verifyBrowser() {
  const browserExecutable = await findBrowserExecutable();
  const staticServer = await startStaticServer();
  const previewDirectory = await preparePreviewDirectory();
  const profileDirectory = await mkdtemp(resolve(tmpdir(), 'portfolio-browser-check-'));
  const browser = spawn(
    browserExecutable,
    [
      '--headless=new',
      '--disable-gpu',
      '--disable-extensions',
      '--no-default-browser-check',
      '--no-first-run',
      '--remote-debugging-port=0',
      `--user-data-dir=${profileDirectory}`,
      ...(process.platform === 'linux' ? ['--no-sandbox'] : []),
      'about:blank',
    ],
    { stdio: 'ignore', windowsHide: true },
  );
  let connection;
  try {
    const version = await waitForDevTools(resolve(profileDirectory, 'DevToolsActivePort'));
    connection = new DevToolsConnection(version.webSocketDebuggerUrl);
    const publishedProjectIds = selectPublishedProjects(projects).map((project) => project.id);
    const featuredCertificationIds = selectFeaturedCertifications(certifications).map(
      (record) => record.id,
    );
    const remainingCertificationIds = selectRemainingCertifications(certifications).map(
      (record) => record.id,
    );
    const publishedCertificationIds = selectPublishedCertifications(certifications).map(
      (record) => record.id,
    );
    const projectFilters = [ALL_PROJECTS_CATEGORY, ...getAvailableProjectCategories(projects)];
    const contracts = [
      {
        id: 'home',
        screenshotPrefix: 'home',
        screenshotWidths: [320, 1440],
        path: '/',
        expectedMetadata: getPageMetadata('home'),
        expectedJsonLd: getPageJsonLd('home'),
        expectedHeading: 'Ahmed Aziz Ben Aissa',
        expectedHomeSections: HOME_SECTION_ORDER,
        expectedFeaturedProjectIds: selectFeaturedProjects(projects).map((project) => project.id),
        expectedFeaturedCertificationIds: featuredCertificationIds,
        expectedRemainingCertificationIds: remainingCertificationIds,
        expectedPublishedCertificationIds: publishedCertificationIds,
        expectedHomeContacts: ['email', 'linkedin', 'github'].map((kind) => ({
          kind,
          href: profile.links[kind].href,
        })),
        expectedNavigationHrefs: [
          '#capabilities',
          '#featured-projects',
          '#experience',
          '#skills',
          '#certifications',
          '#education',
          '#contact',
          '/projects/',
        ],
      },
      {
        id: 'projects',
        screenshotPrefix: 'projects',
        screenshotWidths: [320, 768, 1440],
        path: '/projects/',
        expectedMetadata: getPageMetadata('projects'),
        expectedJsonLd: getPageJsonLd('projects'),
        expectedHeading: 'Projects',
        expectedProjectArticleIds: publishedProjectIds,
        expectedProjectArtifactHrefs: selectPublishedProjects(projects)
          .flatMap((project) => [project.repositoryUrl, project.demoPaperUrl].filter(Boolean)),
        expectedProjectFilters: projectFilters,
        expectedNavigationHrefs: [
          '/#capabilities',
          '/#featured-projects',
          '/#experience',
          '/#skills',
          '/#certifications',
          '/#education',
          '/#contact',
          '/projects/',
        ],
      },
    ];
    const hydrated = [];
    const noJavaScript = [];
    const reducedMotion = [];
    const reflow = [];
    const textOnly = [];
    const forcedColors = [];
    const screenshots = [];
    for (const contract of contracts) {
      for (const scenario of ACCESSIBILITY_SCENARIOS.hydrated) {
        const { id, width, height } = scenario;
        const screenshotFile = previewDirectory && contract.screenshotWidths.includes(width)
          ? resolve(previewDirectory, `${contract.screenshotPrefix}-${width}.png`)
          : null;
        const result = await verifyPage(connection, staticServer.origin, {
          ...contract,
          height,
          javaScriptEnabled: true,
          screenshotFile,
          width,
        });
        if (
          !result.hydrationStatuses.every((status) => status === 'complete') ||
          result.errors.length > 0
        ) {
          throw new Error(
            `${contract.path} at ${width}px did not complete clean hydration (statuses: ${result.hydrationStatuses.join(', ') || 'none'}; signals: ${result.errors.join(', ') || 'none'}).`,
          );
        }
        hydrated.push({
          scenario: id,
          path: contract.path,
          width,
          height,
          status: result.hydrationStatus,
          horizontalOverflow: result.horizontalOverflow,
          clippedContentCount: result.clippedContentCount,
          flowCollisionCount: result.flowCollisionCount,
          anchorsClearStickyHeader: result.anchorsClearStickyHeader,
          certificationLayout: result.certificationLayout,
        });
        if (screenshotFile) screenshots.push(screenshotFile);
      }

      for (const scenario of ACCESSIBILITY_SCENARIOS.noJavaScript) {
        const { id, width, height } = scenario;
        const staticResult = await verifyPage(connection, staticServer.origin, {
          ...contract,
          height,
          javaScriptEnabled: false,
          width,
        });
        if (
          !staticResult.hydrationStatuses.every((status) => status === 'static') ||
          staticResult.errors.length > 0
        ) {
          throw new Error(
            `${contract.path} at ${width}px did not preserve its no-JavaScript static state (statuses: ${staticResult.hydrationStatuses.join(', ') || 'none'}; signals: ${staticResult.errors.join(', ') || 'none'}).`,
          );
        }
        noJavaScript.push({
          scenario: id,
          path: contract.path,
          width,
          height,
          status: staticResult.hydrationStatus,
          horizontalOverflow: staticResult.horizontalOverflow,
          clippedContentCount: staticResult.clippedContentCount,
          flowCollisionCount: staticResult.flowCollisionCount,
          anchorsClearStickyHeader: staticResult.anchorsClearStickyHeader,
          certificationLayout: staticResult.certificationLayout,
        });
      }

      for (const scenario of ACCESSIBILITY_SCENARIOS.reflow) {
        const result = await verifyPage(connection, staticServer.origin, {
          ...contract,
          ...scenario,
          javaScriptEnabled: true,
        });
        reflow.push({
          scenario: scenario.id,
          path: contract.path,
          width: scenario.width,
          equivalentZoomPercent: scenario.equivalentZoomPercent,
          horizontalOverflow: result.horizontalOverflow,
          clippedContentCount: result.clippedContentCount,
          flowCollisionCount: result.flowCollisionCount,
        });
      }

      const textScenario = ACCESSIBILITY_SCENARIOS.textOnly;
      const textResult = await verifyPage(connection, staticServer.origin, {
        ...contract,
        ...textScenario,
        javaScriptEnabled: true,
      });
      textOnly.push({
        scenario: textScenario.id,
        path: contract.path,
        textScalePercent: textScenario.textScalePercent,
        horizontalOverflow: textResult.horizontalOverflow,
        clippedContentCount: textResult.clippedContentCount,
        flowCollisionCount: textResult.flowCollisionCount,
      });

      for (const scenario of ACCESSIBILITY_SCENARIOS.forcedColors) {
        try {
          const result = await verifyPage(connection, staticServer.origin, {
            ...contract,
            ...scenario,
            forcedColors: true,
            javaScriptEnabled: true,
          });
          forcedColors.push({
            scenario: scenario.id,
            path: contract.path,
            supported: true,
            applied: result.forcedColorsApplied,
          });
        } catch (error) {
          if (!/Invalid parameters|Unknown media feature/i.test(error.message)) throw error;
          forcedColors.push({
            scenario: scenario.id,
            path: contract.path,
            supported: false,
            applied: false,
          });
        }
      }

      const reducedResult = await verifyPage(connection, staticServer.origin, {
        ...contract,
        javaScriptEnabled: true,
        reducedMotion: true,
        width: 320,
      });
      if (
        !reducedResult.hydrationStatuses.every((status) => status === 'complete') ||
        !reducedResult.reducedMotionApplied ||
        reducedResult.errors.length > 0
      ) {
        throw new Error(
          `${contract.path} did not preserve clean hydration under reduced motion.`,
        );
      }
      reducedMotion.push({ path: contract.path, width: 320, status: 'reduced' });
    }

    const responsiveAccessibilityRegression = await verifyResponsiveAccessibilityRegression(
      connection,
      staticServer.origin,
    );
    const certificationOverlapRegression = await verifyCertificationOverlapRegression(
      connection,
      staticServer.origin,
    );
    const projectsBehavior = await verifyProjectsBehavior(connection, staticServer.origin);
    const notFound = [];
    for (const width of [320, 1440]) {
      const result = await verifyNotFoundPage(connection, staticServer.origin, previewDirectory, width);
      notFound.push(result);
      if (result.screenshot) screenshots.push(result.screenshot);
    }

    const axeSource = await readFile(resolve(repositoryRoot, 'node_modules/axe-core/axe.min.js'), 'utf8');
    const axe = [];
    for (const state of [
      { id: 'home-closed-mobile', path: '/', width: 320, height: 900 },
      { id: 'home-open-desktop', path: '/', width: 1440, height: 1000, openCertifications: true },
      { id: 'projects-all-mobile', path: '/projects/', width: 320, height: 900 },
      { id: 'projects-filtered-desktop', path: '/projects/', width: 1440, height: 1000, projectFilter: 'agentic-ai' },
      { id: 'not-found-mobile', path: '/404.html', width: 320, height: 900 },
      { id: 'not-found-desktop', path: '/404.html', width: 1440, height: 1000 },
    ]) {
      axe.push(await verifyAxeState(connection, staticServer.origin, axeSource, state));
    }

    const mismatch = await verifyPage(connection, staticServer.origin, {
      ...contracts[0],
      path: '/__mismatch/',
      javaScriptEnabled: true,
      width: 320,
    });
    if (mismatch.hydrationStatus !== 'error' || mismatch.errors.length === 0) {
      throw new Error('Deliberate hydration mismatch was not detected by the browser gate.');
    }
    const projectsMismatch = await verifyPage(connection, staticServer.origin, {
      ...contracts[1],
      path: '/__mismatch/projects/',
      expectedProjectControlsHidden: true,
      javaScriptEnabled: true,
      width: 320,
    });
    if (projectsMismatch.projectsHydrationStatus !== 'error' || projectsMismatch.errors.length === 0) {
      throw new Error('Deliberate Projects hydration mismatch was not detected by the browser gate.');
    }
    return {
      status: 'verified',
      hydrated,
      noJavaScript,
      reducedMotion,
      reflow,
      textOnly,
      forcedColors,
      axe,
      mismatchDetected: true,
      projectsMismatchDetected: true,
      responsiveAccessibilityRegression,
      certificationOverlapRegression,
      projectsBehavior,
      notFound,
      screenshots,
    };
  } finally {
    connection?.close();
    if (browser.exitCode === null) {
      browser.kill();
      await Promise.race([
        new Promise((resolvePromise) => browser.once('exit', resolvePromise)),
        delay(3_000),
      ]);
    }
    await staticServer.close();
    await rm(profileDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

const isCommandLine = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCommandLine) console.log(JSON.stringify(await verifyBrowser(), null, 2));

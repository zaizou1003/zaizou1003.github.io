import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const distDirectory = resolve(repositoryRoot, 'dist');
const privateReportDirectory = resolve(repositoryRoot, 'private/checkpoint-reports');
const quietWindowMilliseconds = 500;

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
]);

function delay(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function preparePreviewDirectory() {
  const requestedDirectory = process.env.MILESTONE3_PREVIEW_DIR;
  if (!requestedDirectory) return null;

  const directory = resolve(requestedDirectory);
  if (
    directory !== privateReportDirectory &&
    !directory.startsWith(`${privateReportDirectory}${sep}`)
  ) {
    throw new Error('Preview output must stay under private/checkpoint-reports.');
  }

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

async function startStaticServer() {
  const homeHtml = await readFile(resolve(distDirectory, 'index.html'), 'utf8');
  const mismatchHtml = createHydrationMismatchFixture(homeHtml);
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      if (url.pathname === '/__mismatch/') {
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        response.end(mismatchHtml);
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

async function verifyPage(
  connection,
  origin,
  {
    path,
    expectedHeading,
    expectedNavigationHrefs,
    javaScriptEnabled,
    reducedMotion = false,
    screenshotFile = null,
    width = 320,
  },
) {
  const { targetId } = await connection.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await connection.send('Target.attachToTarget', { targetId, flatten: true });
  const errors = [];
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

  await connection.send('Runtime.enable', {}, sessionId);
  await connection.send('Page.enable', {}, sessionId);
  await connection.send('Log.enable', {}, sessionId);
  await connection.send(
    'Emulation.setDeviceMetricsOverride',
    {
      width,
      height: width < 768 ? 900 : 1000,
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
          const status = document.querySelector('[data-hydrate-navigation]')?.dataset.hydrationStatus;
          if (status === 'complete' || status === 'error') break;
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
        await new Promise((resolve) => setTimeout(resolve, ${quietWindowMilliseconds}));
      })()`,
    );
  }

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
        linkActivationReturnedFocus: null
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

      return result;
    })()`,
  );

  const snapshot = await evaluate(
    connection,
    sessionId,
    `(() => {
      const skipLink = document.querySelector('.skip-link');
      const primaryNav = document.querySelector('nav[aria-label="Primary"]');
      const summary = document.querySelector('.site-nav__summary');
      const summaryRect = summary?.getBoundingClientRect();
      const contactTypes = [...document.querySelectorAll('[data-contact-kind]')]
        .map((link) => link.dataset.contactKind);
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
          '.site-identity, .site-nav__summary, .site-nav__link, .link-button, .footer-nav a, .footer-contact-link',
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
        horizontalOverflow:
          Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) >
          document.documentElement.clientWidth + 1,
        hydrationStatus: document.querySelector('[data-hydrate-navigation]')?.dataset.hydrationStatus,
        coreTextLength: document.querySelector('#root')?.innerText.trim().length ?? 0
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
  return { ...snapshot, interaction, errors, screenshotFile };
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
    const contracts = [
      {
        id: 'home',
        path: '/',
        expectedHeading: 'Ahmed Aziz Ben Aissa',
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
        path: '/projects/',
        expectedHeading: 'Projects',
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
    const screenshots = [];
    for (const contract of contracts) {
      for (const width of [320, 1440]) {
        const screenshotFile = previewDirectory
          ? resolve(previewDirectory, `${contract.id}-${width}.png`)
          : null;
        const result = await verifyPage(connection, staticServer.origin, {
          ...contract,
          javaScriptEnabled: true,
          screenshotFile,
          width,
        });
        if (result.hydrationStatus !== 'complete' || result.errors.length > 0) {
          throw new Error(
            `${contract.path} at ${width}px did not complete clean hydration (status: ${result.hydrationStatus}; signals: ${result.errors.join(', ') || 'none'}).`,
          );
        }
        hydrated.push({
          path: contract.path,
          width,
          status: result.hydrationStatus,
          horizontalOverflow: result.horizontalOverflow,
        });
        if (screenshotFile) screenshots.push(screenshotFile);

        const staticResult = await verifyPage(connection, staticServer.origin, {
          ...contract,
          javaScriptEnabled: false,
          width,
        });
        if (staticResult.hydrationStatus !== 'static' || staticResult.errors.length > 0) {
          throw new Error(
            `${contract.path} at ${width}px did not preserve its no-JavaScript static state (status: ${staticResult.hydrationStatus}; signals: ${staticResult.errors.join(', ') || 'none'}).`,
          );
        }
        noJavaScript.push({
          path: contract.path,
          width,
          status: staticResult.hydrationStatus,
          horizontalOverflow: staticResult.horizontalOverflow,
        });
      }

      const reducedResult = await verifyPage(connection, staticServer.origin, {
        ...contract,
        javaScriptEnabled: true,
        reducedMotion: true,
        width: 320,
      });
      if (
        reducedResult.hydrationStatus !== 'complete' ||
        !reducedResult.reducedMotionApplied ||
        reducedResult.errors.length > 0
      ) {
        throw new Error(
          `${contract.path} did not preserve clean hydration under reduced motion.`,
        );
      }
      reducedMotion.push({ path: contract.path, width: 320, status: 'reduced' });
    }

    const mismatch = await verifyPage(connection, staticServer.origin, {
      path: '/__mismatch/',
      expectedHeading: 'Ahmed Aziz Ben Aissa',
      expectedNavigationHrefs: contracts[0].expectedNavigationHrefs,
      javaScriptEnabled: true,
      width: 320,
    });
    if (mismatch.hydrationStatus !== 'error' || mismatch.errors.length === 0) {
      throw new Error('Deliberate hydration mismatch was not detected by the browser gate.');
    }
    return {
      status: 'verified',
      hydrated,
      noJavaScript,
      reducedMotion,
      mismatchDetected: true,
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
    await rm(profileDirectory, { recursive: true, force: true });
  }
}

const isCommandLine = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCommandLine) console.log(JSON.stringify(await verifyBrowser(), null, 2));

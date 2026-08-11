import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const distDirectory = resolve(repositoryRoot, 'dist');
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
  const changedIsland = island.replace(/>Home<\/a>/, '>Hydration mismatch fixture</a>');
  if (changedIsland === island) throw new Error('Cannot create mismatch fixture: Home link is missing.');
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

async function verifyPage(connection, origin, { path, expectedHeading, javaScriptEnabled }) {
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
  if (!javaScriptEnabled) {
    await connection.send(
      'Emulation.setDeviceMetricsOverride',
      { width: 320, height: 800, deviceScaleFactor: 1, mobile: true },
      sessionId,
    );
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

  const snapshot = await evaluate(
    connection,
    sessionId,
    `({
      heading: document.querySelector('h1')?.textContent.trim(),
      mainCount: document.querySelectorAll('main').length,
      navCount: document.querySelectorAll('nav').length,
      detailsCount: document.querySelectorAll('details').length,
      summaryCount: document.querySelectorAll('summary').length,
      footerCount: document.querySelectorAll('footer').length,
      linkCount: document.querySelectorAll('a[href]').length,
      hydrationStatus: document.querySelector('[data-hydrate-navigation]')?.dataset.hydrationStatus,
      coreTextLength: document.querySelector('#root')?.innerText.trim().length ?? 0
    })`,
  );
  await connection.send('Target.closeTarget', { targetId });
  runtimeListeners.delete(recordRuntimeError);
  logListeners.delete(logListener);
  consoleListeners.delete(consoleListener);
  if (snapshot.heading !== expectedHeading || snapshot.mainCount !== 1) {
    throw new Error(`${path} is missing its expected heading or single main landmark.`);
  }
  if (
    snapshot.navCount < 2 ||
    snapshot.detailsCount < 1 ||
    snapshot.summaryCount < 1 ||
    snapshot.footerCount !== 1 ||
    snapshot.linkCount < 4 ||
    snapshot.coreTextLength < 20
  ) {
    throw new Error(`${path} is missing readable core navigation, footer, links, or content.`);
  }
  return { ...snapshot, errors };
}

export async function verifyBrowser() {
  const browserExecutable = await findBrowserExecutable();
  const staticServer = await startStaticServer();
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
      { path: '/', expectedHeading: 'Ahmed Aziz Ben Aissa' },
      { path: '/projects/', expectedHeading: 'Projects' },
    ];
    const hydrated = [];
    const noJavaScript = [];
    for (const contract of contracts) {
      const result = await verifyPage(connection, staticServer.origin, {
        ...contract,
        javaScriptEnabled: true,
      });
      if (result.hydrationStatus !== 'complete' || result.errors.length > 0) {
        throw new Error(
          `${contract.path} did not complete clean hydration (status: ${result.hydrationStatus}; signals: ${result.errors.join(', ') || 'none'}).`,
        );
      }
      hydrated.push({ path: contract.path, status: result.hydrationStatus });

      const staticResult = await verifyPage(connection, staticServer.origin, {
        ...contract,
        javaScriptEnabled: false,
      });
      if (staticResult.hydrationStatus !== 'static' || staticResult.errors.length > 0) {
        throw new Error(
          `${contract.path} did not preserve its no-JavaScript static state (status: ${staticResult.hydrationStatus}; signals: ${staticResult.errors.join(', ') || 'none'}).`,
        );
      }
      noJavaScript.push({ path: contract.path, status: staticResult.hydrationStatus });
    }

    const mismatch = await verifyPage(connection, staticServer.origin, {
      path: '/__mismatch/',
      expectedHeading: 'Ahmed Aziz Ben Aissa',
      javaScriptEnabled: true,
    });
    if (mismatch.hydrationStatus !== 'error' || mismatch.errors.length === 0) {
      throw new Error('Deliberate hydration mismatch was not detected by the browser gate.');
    }
    return { status: 'verified', hydrated, noJavaScript, mismatchDetected: true };
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

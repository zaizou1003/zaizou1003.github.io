import { spawn } from 'node:child_process';
import { access, lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  candidateAssets,
  candidateDirectory,
  candidateFilenames,
  createFaviconSvg,
  createIconRasterDocument,
  createPreviewBoardDocument,
  createSocialCardDocument,
  repositoryRoot,
} from './assets/manifest.mjs';
import {
  resolveCandidatePath,
  validateAssetManifest,
  verifyApprovedCompositions,
  verifyCandidateBuffer,
  verifyCandidateDirectory,
} from './verify-assets.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const exactCandidateDirectory = resolve(
  repositoryRoot,
  'private/checkpoint-reports/milestone-6-candidates',
);

function delay(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function firstAccessible(paths) {
  for (const path of paths.filter(Boolean)) {
    try {
      await access(path);
      return path;
    } catch {
      // Continue through the fixed browser-executable locations.
    }
  }
  throw new Error('No supported local Chromium browser was found for asset generation.');
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
    const id = this.nextId;
    this.nextId += 1;
    const response = new Promise((resolvePromise, reject) => {
      this.pending.set(id, { resolve: resolvePromise, reject });
    });
    this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return response;
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

  addListener(method, listener) {
    const listeners = this.listeners.get(method) ?? new Set();
    listeners.add(listener);
    this.listeners.set(method, listeners);
    return () => listeners.delete(listener);
  }

  close() {
    this.socket.close();
  }
}

async function waitForDevTools(portFile) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
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

function assertOwnedTemporaryPath(path, prefix) {
  const tempRoot = resolve(tmpdir());
  const resolvedPath = resolve(path);
  if (!resolvedPath.startsWith(`${tempRoot}${sep}`) || !dirname(resolvedPath).startsWith(tempRoot)) {
    throw new Error('Temporary path escaped the operating-system temp directory.');
  }
  const leaf = resolvedPath.slice(resolvedPath.lastIndexOf(sep) + 1);
  if (!leaf.startsWith(prefix)) throw new Error('Temporary path does not have the verifier-owned prefix.');
  return resolvedPath;
}

async function captureDocument(connection, document, { format, height, opaque, quality, width }) {
  const { targetId } = await connection.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await connection.send('Target.attachToTarget', { targetId, flatten: true });
  const externalRequests = [];
  const removeNetworkListener = connection.addListener('Network.requestWillBeSent', (message) => {
    if (message.sessionId !== sessionId) return;
    const url = message.params.request.url;
    if (!url.startsWith('data:') && url !== 'about:blank') externalRequests.push(url);
  });
  try {
    await connection.send('Page.enable', {}, sessionId);
    await connection.send('Runtime.enable', {}, sessionId);
    await connection.send('Network.enable', {}, sessionId);
    await connection.send(
      'Network.setBlockedURLs',
      { urls: ['http://*', 'https://*', 'ftp://*', 'file://*'] },
      sessionId,
    );
    await connection.send(
      'Emulation.setDeviceMetricsOverride',
      { width, height, deviceScaleFactor: 1, mobile: false },
      sessionId,
    );
    await connection.send(
      'Emulation.setDefaultBackgroundColorOverride',
      { color: opaque ? { r: 8, g: 17, b: 31, a: 1 } : { r: 0, g: 0, b: 0, a: 0 } },
      sessionId,
    );
    const loaded = connection.once('Page.loadEventFired', sessionId);
    const dataUrl = `data:text/html;base64,${Buffer.from(document, 'utf8').toString('base64')}`;
    await connection.send('Page.navigate', { url: dataUrl }, sessionId);
    await loaded;
    const readiness = await connection.send(
      'Runtime.evaluate',
      {
        expression: `(async()=>{await document.fonts.ready;await Promise.all([...document.images].map((image)=>image.complete?Promise.resolve():new Promise((resolve,reject)=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',reject,{once:true})})));return {width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight}})()`,
        awaitPromise: true,
        returnByValue: true,
      },
      sessionId,
    );
    if (readiness.exceptionDetails) throw new Error('Asset document did not become ready.');
    const measured = readiness.result.value;
    if (measured.width !== width || measured.height !== height) {
      throw new Error(`Raster document dimensions changed unexpectedly (${measured.width}x${measured.height}).`);
    }
    if (externalRequests.length > 0) throw new Error('Asset rasterization attempted an external request.');
    const screenshot = await connection.send(
      'Page.captureScreenshot',
      {
        format,
        ...(format === 'jpeg' ? { quality } : {}),
        fromSurface: true,
        captureBeyondViewport: false,
        clip: { x: 0, y: 0, width, height, scale: 1 },
      },
      sessionId,
    );
    return Buffer.from(screenshot.data, 'base64');
  } finally {
    removeNetworkListener();
    await connection.send('Target.closeTarget', { targetId });
  }
}

async function withTemporaryChromium(render) {
  const browserExecutable = await findBrowserExecutable();
  const profileDirectory = assertOwnedTemporaryPath(
    await mkdtemp(resolve(tmpdir(), 'portfolio-asset-browser-')),
    'portfolio-asset-browser-',
  );
  const browser = spawn(
    browserExecutable,
    [
      '--headless=new',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-gpu',
      '--disable-sync',
      '--metrics-recording-only',
      '--no-default-browser-check',
      '--no-first-run',
      '--no-pings',
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
    return await render(connection);
  } finally {
    if (connection) {
      try {
        await connection.send('Browser.close');
      } catch {
        // The owned browser may already have exited.
      }
      connection.close();
    }
    if (browser.exitCode === null) {
      await Promise.race([
        new Promise((resolvePromise) => browser.once('exit', resolvePromise)),
        delay(3_000),
      ]);
    }
    if (browser.exitCode === null) {
      browser.kill();
      await Promise.race([
        new Promise((resolvePromise) => browser.once('exit', resolvePromise)),
        delay(3_000),
      ]);
    }
    await rm(profileDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
  }
}

function definitionFor(filename) {
  const definition = candidateAssets.find((asset) => asset.filename === filename);
  if (!definition) throw new Error(`Missing manifest definition for ${filename}.`);
  return definition;
}

function dataUrlFor(buffer, format) {
  const mime = format === 'jpeg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/svg+xml';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

async function generateBuffers() {
  validateAssetManifest();
  verifyApprovedCompositions();
  const buffers = new Map([['favicon.svg', Buffer.from(createFaviconSvg(), 'utf8')]]);
  await withTemporaryChromium(async (connection) => {
    for (const size of [16, 32, 64]) {
      const filename = `favicon-${size}-preview.png`;
      buffers.set(
        filename,
        await captureDocument(connection, createIconRasterDocument({ size, opaque: false }), {
          format: 'png',
          height: size,
          opaque: false,
          width: size,
        }),
      );
    }
    buffers.set(
      'apple-touch-icon.png',
      await captureDocument(connection, createIconRasterDocument({ size: 180, opaque: true }), {
        format: 'png',
        height: 180,
        opaque: true,
        width: 180,
      }),
    );
    for (const copyKey of ['home', 'projects']) {
      buffers.set(
        `${copyKey}-og.jpg`,
        await captureDocument(connection, createSocialCardDocument(copyKey), {
          format: 'jpeg',
          height: 630,
          opaque: true,
          quality: 86,
          width: 1200,
        }),
      );
    }
    const previewRecords = [...buffers]
      .filter(([filename]) => filename !== 'favicon.svg')
      .map(([filename, buffer]) => {
        const definition = definitionFor(filename);
        return {
          filename,
          width: definition.width,
          height: definition.height,
          bytes: buffer.length,
          dataUrl: dataUrlFor(buffer, definition.format),
        };
      });
    buffers.set(
      'milestone-6-preview-board.png',
      await captureDocument(connection, createPreviewBoardDocument(previewRecords), {
        format: 'png',
        height: 1180,
        opaque: true,
        width: 1600,
      }),
    );
  });
  if (buffers.size !== candidateAssets.length) throw new Error('Generated candidate inventory is incomplete.');
  for (const definition of candidateAssets) {
    verifyCandidateBuffer(buffers.get(definition.filename), definition);
  }
  return buffers;
}

async function prepareCandidateDestination() {
  if (resolve(candidateDirectory) !== exactCandidateDirectory) {
    throw new Error('Candidate directory does not match the fixed ignored destination.');
  }
  try {
    const rootStat = await lstat(candidateDirectory);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
      throw new Error('Candidate destination is not a real directory.');
    }
    const entries = await readdir(candidateDirectory, { withFileTypes: true });
    const names = entries.map(({ name }) => name).sort();
    const expected = [...candidateFilenames].sort();
    if (names.length !== expected.length || names.some((name, index) => name !== expected[index])) {
      throw new Error('Existing candidate directory does not have the exact approved inventory.');
    }
    for (const entry of entries) {
      const stat = await lstat(resolveCandidatePath(candidateDirectory, entry.name));
      if (!entry.isFile() || entry.isSymbolicLink() || !stat.isFile() || stat.isSymbolicLink()) {
        throw new Error(`Unsafe existing candidate destination: ${entry.name}`);
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await mkdir(candidateDirectory, { recursive: false });
  }
}

export async function generateAssetCandidates() {
  if (process.argv.length > 2) throw new Error('The asset generator accepts no path or output override.');
  const temporaryOutput = assertOwnedTemporaryPath(
    await mkdtemp(resolve(tmpdir(), 'portfolio-m6-assets-')),
    'portfolio-m6-assets-',
  );
  try {
    const buffers = await generateBuffers();
    for (const definition of candidateAssets) {
      await writeFile(resolveCandidatePath(temporaryOutput, definition.filename), buffers.get(definition.filename), {
        flag: 'wx',
      });
    }
    await verifyCandidateDirectory({ directory: temporaryOutput });
    await prepareCandidateDestination();
    for (const definition of candidateAssets) {
      const temporaryPath = resolveCandidatePath(temporaryOutput, definition.filename);
      const destination = resolveCandidatePath(candidateDirectory, definition.filename);
      await writeFile(destination, await readFile(temporaryPath));
    }
    const verification = await verifyCandidateDirectory();
    return {
      status: 'generated-and-verified',
      directory: candidateDirectory,
      assets: verification.assets,
    };
  } finally {
    await rm(temporaryOutput, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}

const isCommandLine = process.argv[1] && resolve(process.argv[1]) === scriptPath;
if (isCommandLine) console.log(JSON.stringify(await generateAssetCandidates(), null, 2));

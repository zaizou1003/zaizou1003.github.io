import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import { extname, isAbsolute, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  approvedCrawlDistPaths,
  approvedCrawlSourcePaths,
  crawlFiles,
  distDirectory,
  publicDirectory,
} from './static/manifest.mjs';

export const EXACT_ROBOTS_TEXT = `User-agent: *
Allow: /

Sitemap: https://ahmedazizbenaissa.me/sitemap.xml
`;

export const EXACT_SITEMAP_TEXT = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://ahmedazizbenaissa.me/</loc>
  </url>
  <url>
    <loc>https://ahmedazizbenaissa.me/projects/</loc>
  </url>
</urlset>
`;

const EXPECTED_MANIFEST = Object.freeze([
  Object.freeze({
    role: 'robots',
    sourcePath: 'robots.txt',
    distPath: 'robots.txt',
    extension: '.txt',
    mimeType: 'text/plain',
    maxBytes: 256,
    approvedSha256: 'e3901357f2e64c8c98018cfffe06859700d6858161d7b5554e642787d0011fdd',
  }),
  Object.freeze({
    role: 'sitemap',
    sourcePath: 'sitemap.xml',
    distPath: 'sitemap.xml',
    extension: '.xml',
    mimeType: 'application/xml',
    maxBytes: 1024,
    approvedSha256: '77830e55473e09dd501c81267edc59adfedf2061d597ff55e15422fdad21edaa',
  }),
  Object.freeze({
    role: 'not-found',
    sourcePath: '404.html',
    distPath: '404.html',
    extension: '.html',
    mimeType: 'text/html',
    maxBytes: 12 * 1024,
    approvedSha256: 'be013a04c9419a57893cecca34863c5d79dc5b385484185c06544b06d908ebad',
  }),
]);

const DEFINITION_KEYS = Object.freeze([
  'role',
  'sourcePath',
  'distPath',
  'extension',
  'mimeType',
  'maxBytes',
  'approvedSha256',
]);

function assertExactKeys(value, expected, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label}-plain-object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${label}-property-allowlist`);
  }
}

export function assertSafeCrawlPath(relativePath, allowlist) {
  if (
    typeof relativePath !== 'string' ||
    !relativePath ||
    isAbsolute(relativePath) ||
    relativePath.includes('\\') ||
    relativePath.includes('://') ||
    relativePath.includes('?') ||
    relativePath.includes('#') ||
    relativePath.includes(':') ||
    relativePath.split('/').some((segment) => !segment || segment === '.' || segment === '..') ||
    /(?:private|recovery|certificate|resume|curriculum|\.env)/i.test(relativePath) ||
    !allowlist.includes(relativePath)
  ) {
    throw new Error(`unsafe-crawl-path: ${String(relativePath)}`);
  }
  return relativePath;
}

export function resolveCrawlPath(root, relativePath, allowlist) {
  assertSafeCrawlPath(relativePath, allowlist);
  const resolvedRoot = resolve(root);
  const resolved = resolve(resolvedRoot, relativePath);
  if (resolved === resolvedRoot || !resolved.startsWith(`${resolvedRoot}${sep}`)) {
    throw new Error(`crawl-path-escaped-root: ${relativePath}`);
  }
  return resolved;
}

export function validateCrawlManifest(definitions = crawlFiles) {
  if (!Array.isArray(definitions) || definitions.length !== EXPECTED_MANIFEST.length) {
    throw new Error('unexpected-crawl-manifest-entry');
  }
  definitions.forEach((definition, index) => {
    const expected = EXPECTED_MANIFEST[index];
    assertExactKeys(definition, DEFINITION_KEYS, `crawl-definition-${index + 1}`);
    for (const key of DEFINITION_KEYS) {
      if (definition[key] !== expected[key]) throw new Error('unexpected-crawl-manifest-entry');
    }
    assertSafeCrawlPath(definition.sourcePath, approvedCrawlSourcePaths);
    assertSafeCrawlPath(definition.distPath, approvedCrawlDistPaths);
    if (extname(definition.sourcePath) !== definition.extension) {
      throw new Error('crawl-extension-mismatch');
    }
  });
  if (new Set(definitions.map(({ sourcePath }) => sourcePath)).size !== definitions.length) {
    throw new Error('duplicate-crawl-source');
  }
  if (new Set(definitions.map(({ distPath }) => distPath)).size !== definitions.length) {
    throw new Error('duplicate-crawl-destination');
  }
  return true;
}

export function verifyRobotsText(text) {
  if (text !== EXACT_ROBOTS_TEXT) throw new Error('robots-exact-content');
  if ((text.match(/^Sitemap:/gm) ?? []).length !== 1) throw new Error('robots-sitemap-count');
  return true;
}

export function verifySitemapText(text) {
  if (text !== EXACT_SITEMAP_TEXT) throw new Error('sitemap-exact-content');
  const locations = [...text.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  const expected = [
    'https://ahmedazizbenaissa.me/',
    'https://ahmedazizbenaissa.me/projects/',
  ];
  if (JSON.stringify(locations) !== JSON.stringify(expected)) throw new Error('sitemap-url-order');
  if ((text.match(/<url>/g) ?? []).length !== 2 || (text.match(/<\/url>/g) ?? []).length !== 2) {
    throw new Error('sitemap-url-count');
  }
  return true;
}

function count(source, expression) {
  return source.match(expression)?.length ?? 0;
}

export function verifyNotFoundHtml(html) {
  if (!/^<!doctype html>/i.test(html) || !/<html\s+lang="en">/i.test(html)) {
    throw new Error('not-found-document-language');
  }
  if (count(html, /<title>Page Not Found — Ahmed Aziz Ben Aissa<\/title>/g) !== 1) {
    throw new Error('not-found-title');
  }
  if (
    count(
      html,
      /<meta\b[^>]*name="robots"[^>]*content="noindex"[^>]*>/gi,
    ) !== 1 ||
    count(html, /\bnoindex\b/gi) !== 1
  ) {
    throw new Error('not-found-noindex');
  }
  if (count(html, /<main\b/gi) !== 1 || count(html, /<h1>Page not found<\/h1>/g) !== 1) {
    throw new Error('not-found-landmarks');
  }
  const requiredVisibleText = [
    'Ahmed Aziz Ben Aissa',
    'AI Systems Engineer',
    '404',
    'Page not found',
    'The page you requested does not exist or may have moved.',
    'Return home',
    'View projects',
  ];
  if (requiredVisibleText.some((value) => !html.includes(value))) {
    throw new Error('not-found-approved-copy');
  }
  const anchorHrefs = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/gi)].map((match) => match[1]);
  if (JSON.stringify(anchorHrefs) !== JSON.stringify(['/', '/', '/projects/'])) {
    throw new Error('not-found-link-contract');
  }
  if (
    !/<link\b[^>]*rel="icon"[^>]*href="\/favicon\.svg"[^>]*>/i.test(html) ||
    !/<link\b[^>]*rel="apple-touch-icon"[^>]*sizes="180x180"[^>]*href="\/apple-touch-icon\.png"[^>]*>/i.test(html)
  ) {
    throw new Error('not-found-icon-contract');
  }
  if (
    /<script\b|<form\b|<iframe\b|<object\b|<embed\b|<img\b|http-equiv\s*=\s*["']refresh|window\.location|location\.replace|location\.assign|https?:\/\/|\/\//i.test(html)
  ) {
    throw new Error('not-found-active-or-external-content');
  }
  if (/rel="canonical"|application\/ld\+json|react|spa fallback/i.test(html)) {
    throw new Error('not-found-forbidden-metadata-or-runtime');
  }
  for (const token of [
    '#08111f',
    '#101b2d',
    '#f5f7fa',
    '#b7c3d4',
    '#5eead4',
    '#062821',
    '#7dd3fc',
    '#5b7393',
    '#fde047',
  ]) {
    if (!html.includes(token)) throw new Error('not-found-design-token');
  }
  if (!/min-height:\s*44px/i.test(html) || !/outline:\s*3px solid #fde047/i.test(html)) {
    throw new Error('not-found-focus-or-target-contract');
  }
  return true;
}

export function verifyCrawlBuffer(buffer, definition) {
  if (!Buffer.isBuffer(buffer)) throw new Error('crawl-file-buffer-required');
  if (buffer.length === 0 || buffer.length > definition.maxBytes) throw new Error('crawl-file-byte-budget');
  const text = buffer.toString('utf8');
  if (text.startsWith('\uFEFF') || text.includes('\uFFFD') || !text.endsWith('\n')) {
    throw new Error('crawl-file-utf8-or-newline');
  }
  if (definition.role === 'robots') verifyRobotsText(text);
  else if (definition.role === 'sitemap') verifySitemapText(text);
  else if (definition.role === 'not-found') verifyNotFoundHtml(text);
  else throw new Error('unknown-crawl-file-role');
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  if (sha256 !== definition.approvedSha256) throw new Error('crawl-file-hash-mismatch');
  return {
    role: definition.role,
    path: definition.sourcePath,
    mimeType: definition.mimeType,
    bytes: buffer.length,
    sha256,
  };
}

export async function assertRegularCrawlPath(
  root,
  relativePath,
  allowlist,
  lstatFunction = lstat,
) {
  const resolvedRoot = resolve(root);
  const rootStat = await lstatFunction(resolvedRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('crawl-root-real-directory');
  const segments = assertSafeCrawlPath(relativePath, allowlist).split('/');
  let current = resolvedRoot;
  for (let index = 0; index < segments.length; index += 1) {
    current = resolve(current, segments[index]);
    const pathStat = await lstatFunction(current);
    if (pathStat.isSymbolicLink()) throw new Error(`crawl-file-symlink: ${relativePath}`);
    const isLast = index === segments.length - 1;
    if ((!isLast && !pathStat.isDirectory()) || (isLast && !pathStat.isFile())) {
      throw new Error(`crawl-file-not-regular: ${relativePath}`);
    }
  }
  return current;
}

async function verifyCrawlSet({ directory, definitions, pathKey, allowlist }) {
  validateCrawlManifest(definitions);
  const files = [];
  for (const definition of definitions) {
    const relativePath = definition[pathKey];
    const path = await assertRegularCrawlPath(directory, relativePath, allowlist);
    const result = verifyCrawlBuffer(await readFile(path), definition);
    files.push({ ...result, path: relativePath });
  }
  return files;
}

export async function verifyCrawlSourceFiles({
  directory = publicDirectory,
  definitions = crawlFiles,
} = {}) {
  return {
    status: 'verified',
    directory: resolve(directory),
    files: await verifyCrawlSet({
      directory,
      definitions,
      pathKey: 'sourcePath',
      allowlist: approvedCrawlSourcePaths,
    }),
  };
}

export async function verifyDistCrawlFiles({
  directory = distDirectory,
  sourceDirectory = publicDirectory,
  definitions = crawlFiles,
} = {}) {
  const sourceFiles = await verifyCrawlSet({
    directory: sourceDirectory,
    definitions,
    pathKey: 'sourcePath',
    allowlist: approvedCrawlSourcePaths,
  });
  const distFiles = await verifyCrawlSet({
    directory,
    definitions,
    pathKey: 'distPath',
    allowlist: approvedCrawlDistPaths,
  });
  for (let index = 0; index < definitions.length; index += 1) {
    const source = await readFile(
      resolveCrawlPath(sourceDirectory, definitions[index].sourcePath, approvedCrawlSourcePaths),
    );
    const destination = await readFile(
      resolveCrawlPath(directory, definitions[index].distPath, approvedCrawlDistPaths),
    );
    if (!source.equals(destination) || sourceFiles[index].sha256 !== distFiles[index].sha256) {
      throw new Error(`crawl-source-dist-mismatch: ${definitions[index].distPath}`);
    }
  }
  return { status: 'verified', directory: resolve(directory), files: distFiles };
}

const isCommandLine = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCommandLine) {
  if (process.argv.length > 2) throw new Error('The crawl verifier accepts no path override.');
  console.log(JSON.stringify(await verifyCrawlSourceFiles(), null, 2));
}

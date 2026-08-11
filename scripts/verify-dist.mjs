import { lstat, readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectArtifactText } from '../src/validation/privacy.js';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const defaultDistDirectory = resolve(repositoryRoot, 'dist');

export const ROOT_END_SENTINEL = '<!--app-root-end-->';

export const DEFAULT_PAGE_CONTRACTS = Object.freeze([
  { id: 'home', relativeFile: 'index.html', heading: 'Ahmed Aziz Ben Aissa' },
  { id: 'projects', relativeFile: 'projects/index.html', heading: 'Projects' },
]);

const ALLOWED_ARTIFACT_EXTENSIONS = new Set([
  '.avif',
  '.css',
  '.html',
  '.ico',
  '.jpeg',
  '.jpg',
  '.js',
  '.json',
  '.png',
  '.svg',
  '.txt',
  '.webp',
  '.xml',
]);
const TEXT_ARTIFACT_EXTENSIONS = new Set(['.css', '.html', '.js', '.json', '.svg', '.txt', '.xml']);
const FORBIDDEN_FILENAME_FRAGMENTS = [
  '.env',
  'certificate',
  'curriculum-vitae',
  'private',
  'recovery',
  'resume',
];

function countMatches(source, expression) {
  return source.match(expression)?.length ?? 0;
}

function visibleText(markup) {
  return markup
    .replaceAll(/<!--[\s\S]*?-->/g, '')
    .replaceAll(/<[^>]+>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

function findMatchingRootClose(html, contentStart, file) {
  const tagPattern = /<\/?div\b[^>]*>/gi;
  tagPattern.lastIndex = contentStart;
  let depth = 1;
  let match;
  while ((match = tagPattern.exec(html))) {
    const tag = match[0];
    if (/^<\/div/i.test(tag)) {
      depth -= 1;
      if (depth === 0) return { start: match.index, end: tagPattern.lastIndex };
    } else if (!/\/>$/.test(tag)) {
      depth += 1;
    }
  }
  throw new Error(`${file} has an unclosed #root boundary.`);
}

export function extractRootMarkup(html, file = 'HTML document') {
  const rootOpenings = [...html.matchAll(/<div\b[^>]*\bid\s*=\s*(["'])root\1[^>]*>/gi)];
  if (rootOpenings.length !== 1) {
    throw new Error(`${file} must contain exactly one #root opening; found ${rootOpenings.length}.`);
  }
  const sentinelCount = html.split(ROOT_END_SENTINEL).length - 1;
  if (sentinelCount !== 1) {
    throw new Error(`${file} must contain exactly one root-end boundary; found ${sentinelCount}.`);
  }

  const opening = rootOpenings[0];
  const contentStart = opening.index + opening[0].length;
  const closing = findMatchingRootClose(html, contentStart, file);
  const sentinelIndex = html.indexOf(ROOT_END_SENTINEL);
  const bodyClosingIndex = html.indexOf('</body>', closing.end);
  if (sentinelIndex < closing.end || bodyClosingIndex === -1 || sentinelIndex > bodyClosingIndex) {
    throw new Error(`${file} root-end boundary must immediately follow the matching #root close inside body.`);
  }
  if (html.slice(closing.end, sentinelIndex).trim() !== '') {
    throw new Error(`${file} contains content outside #root before its root-end boundary.`);
  }

  return html.slice(contentStart, closing.start);
}

export function verifyPageHtml(html, contract, file = contract.relativeFile ?? contract.id) {
  if (!/<script\b[^>]*type=["']module["'][^>]*>/i.test(html)) {
    throw new Error(`${file} does not reference a client module.`);
  }
  const rootMarkup = extractRootMarkup(html, file);
  const text = visibleText(rootMarkup);
  if (!text) throw new Error(`${file} has an empty, whitespace-only, or comment-only mount.`);
  if (/^(?:loading(?:…|\.\.\.)?|please wait)$/i.test(text)) {
    throw new Error(`${file} contains only a loading shell.`);
  }
  if (html.includes('<!--app-html-->')) {
    throw new Error(`${file} still contains the prerender injection marker.`);
  }
  if (countMatches(rootMarkup, /<main(?:\s|>)/gi) !== 1) {
    throw new Error(`${file} must contain exactly one main landmark in #root.`);
  }

  const escapedHeading = contract.heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const headingPattern = new RegExp(`<h1(?:\\s[^>]*)?>[\\s\\S]*?${escapedHeading}[\\s\\S]*?<\\/h1>`, 'i');
  if (!headingPattern.test(rootMarkup)) {
    throw new Error(`${file} is missing the expected h1: ${contract.heading}.`);
  }
  for (const requiredPattern of [/<nav(?:\s|>)/i, /<footer(?:\s|>)/i, /data-hydrate-navigation/i]) {
    if (!requiredPattern.test(rootMarkup)) throw new Error(`${file} is missing required static shell content.`);
  }
  if (!rootMarkup.includes(`data-static-page="${contract.id}"`)) {
    throw new Error(`${file} is missing its static page identifier.`);
  }
  return rootMarkup;
}

export function assertAllowedArtifactFilename(normalizedName) {
  const extension = extname(normalizedName.toLowerCase());
  if (!ALLOWED_ARTIFACT_EXTENSIONS.has(extension)) {
    throw new Error(`artifact-extension: ${normalizedName}`);
  }
  const lowerName = normalizedName.toLowerCase();
  if (FORBIDDEN_FILENAME_FRAGMENTS.some((fragment) => lowerName.includes(fragment))) {
    throw new Error(`private-artifact-filename: ${normalizedName}`);
  }
}

export function assertPublishSafeArtifactText(content, normalizedName) {
  const rules = inspectArtifactText(content);
  if (rules.length > 0) throw new Error(`${rules[0]}: ${normalizedName}`);
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`symbolic-link-artifact: ${entry.name}`);
      return entry.isDirectory() ? listFiles(path) : [path];
    }),
  );
  return nested.flat();
}

export async function verifyDistribution({
  distDirectory = defaultDistDirectory,
  pageContracts = DEFAULT_PAGE_CONTRACTS,
} = {}) {
  const verifiedPages = [];
  for (const contract of pageContracts) {
    const file = resolve(distDirectory, contract.relativeFile);
    const html = await readFile(file, 'utf8');
    verifyPageHtml(html, contract, contract.relativeFile);
    verifiedPages.push({
      file: contract.relativeFile.replaceAll('\\', '/'),
      bytes: Buffer.byteLength(html, 'utf8'),
    });
  }

  const outputFiles = await listFiles(distDirectory);
  for (const file of outputFiles) {
    const normalizedName = relative(distDirectory, file).replaceAll('\\', '/');
    if ((await lstat(file)).isSymbolicLink()) throw new Error(`symbolic-link-artifact: ${normalizedName}`);
    assertAllowedArtifactFilename(normalizedName);
    if (TEXT_ARTIFACT_EXTENSIONS.has(extname(normalizedName).toLowerCase())) {
      const content = await readFile(file, 'utf8');
      assertPublishSafeArtifactText(content, normalizedName);
    }
  }

  const files = await Promise.all(
    outputFiles.map(async (file) => ({
      file: relative(distDirectory, file).replaceAll('\\', '/'),
      bytes: (await stat(file)).size,
    })),
  );
  return { status: 'verified', pages: verifiedPages, files: files.sort((a, b) => a.file.localeCompare(b.file)) };
}

const isCommandLine = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCommandLine) {
  console.log(JSON.stringify(await verifyDistribution(), null, 2));
}

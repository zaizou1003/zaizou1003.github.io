import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  METADATA_PAGE_IDS,
  getPageJsonLd,
  getPageMetadata,
  serializeJsonLd,
  validateJsonLdDocument,
  validateMetadataManifest,
} from './manifest.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '../..');

export const METADATA_SOURCE_PATHS = Object.freeze({
  home: resolve(repositoryRoot, 'index.html'),
  projects: resolve(repositoryRoot, 'projects/index.html'),
});

const APPROVED_METADATA_ENTRY_PATHS = new Map([
  ['index.html', 'home'],
  ['/index.html', 'home'],
  ['projects/index.html', 'projects'],
  ['/projects/index.html', 'projects'],
  [METADATA_SOURCE_PATHS.home, 'home'],
  [METADATA_SOURCE_PATHS.projects, 'projects'],
  [METADATA_SOURCE_PATHS.home.replaceAll('\\', '/'), 'home'],
  [METADATA_SOURCE_PATHS.projects.replaceAll('\\', '/'), 'projects'],
]);

export const METADATA_MARKER = '<!--page-metadata-->';

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

function countOccurrences(source, value) {
  return source.split(value).length - 1;
}

function getAttribute(tag, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return tag.match(new RegExp(`\\b${escapedName}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2] ?? null;
}

function tagsMatching(html, expression) {
  return [...html.matchAll(expression)].map(([tag]) => tag);
}

function assertSingleTagValue(html, expression, attribute, expected, label) {
  const tags = tagsMatching(html, expression);
  if (tags.length !== 1 || getAttribute(tags[0], attribute) !== expected) {
    throw new Error(`${label}-exactly-one-approved-value`);
  }
}

export function renderMetadataBlock(pageId) {
  validateMetadataManifest();
  const metadata = getPageMetadata(pageId);
  const jsonLd = serializeJsonLd(getPageJsonLd(pageId), pageId);
  return [
    `<title>${escapeHtml(metadata.title)}</title>`,
    `<meta name="description" content="${escapeHtml(metadata.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(metadata.canonicalUrl)}" />`,
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />',
    '<meta property="og:type" content="website" />',
    `<meta property="og:url" content="${escapeHtml(metadata.canonicalUrl)}" />`,
    `<meta property="og:title" content="${escapeHtml(metadata.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(metadata.description)}" />`,
    `<meta property="og:image" content="${escapeHtml(metadata.socialImageUrl)}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${escapeHtml(metadata.socialImageAlt)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(metadata.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(metadata.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(metadata.socialImageUrl)}" />`,
    `<meta name="twitter:image:alt" content="${escapeHtml(metadata.socialImageAlt)}" />`,
    `<script type="application/ld+json">${jsonLd}</script>`,
  ].join('\n    ');
}

export function transformPageHtml(html, pageId) {
  if (!METADATA_PAGE_IDS.includes(pageId)) throw new Error('unknown-metadata-page');
  if (countOccurrences(html, METADATA_MARKER) !== 1) {
    throw new Error(`${pageId}-metadata-marker-count`);
  }
  if (
    /<title\b/i.test(html) ||
    /<meta\b[^>]*\bname\s*=\s*(["'])description\1/i.test(html) ||
    /<link\b[^>]*\brel\s*=\s*(["'])canonical\1/i.test(html) ||
    /(?:property|name)\s*=\s*(["'])(?:og:|twitter:)/i.test(html) ||
    /application\/ld\+json/i.test(html)
  ) {
    throw new Error(`${pageId}-template-conflicting-metadata`);
  }
  return html.replace(METADATA_MARKER, renderMetadataBlock(pageId));
}

export function resolveMetadataPageId(pathname) {
  if (typeof pathname !== 'string' || pathname.length === 0 || /[?#\0]/.test(pathname)) {
    throw new Error('unknown-metadata-entry');
  }
  const pageId = APPROVED_METADATA_ENTRY_PATHS.get(pathname);
  if (pageId) return pageId;
  throw new Error('unknown-metadata-entry');
}

export function metadataHtmlPlugin() {
  return {
    name: 'validated-static-metadata',
    enforce: 'pre',
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        if (!html.includes(METADATA_MARKER)) return html;
        const source = context?.filename ?? context?.path;
        if (!source) throw new Error('missing-metadata-entry-context');
        return transformPageHtml(html, resolveMetadataPageId(source));
      },
    },
  };
}

function extractJsonLd(html, pageId) {
  const scripts = tagsMatching(
    html,
    /<script\b[^>]*\btype\s*=\s*(["'])application\/ld\+json\1[^>]*>[\s\S]*?<\/script>/gi,
  );
  if (scripts.length !== 1) throw new Error(`${pageId}-json-ld-count`);
  const text = scripts[0].replace(/^<script\b[^>]*>/i, '').replace(/<\/script>$/i, '');
  if (/[<>&\u2028\u2029]/u.test(text) || /<\/script/i.test(text)) {
    throw new Error(`${pageId}-unsafe-json-ld-text`);
  }
  let document;
  try {
    document = JSON.parse(text);
  } catch {
    throw new Error(`${pageId}-invalid-json-ld`);
  }
  validateJsonLdDocument(document, pageId);
  if (serializeJsonLd(document, pageId) !== text) {
    throw new Error(`${pageId}-non-deterministic-json-ld`);
  }
  return document;
}

export function verifyPageMetadataHtml(html, pageId) {
  const metadata = getPageMetadata(pageId);
  if (html.includes(METADATA_MARKER)) throw new Error(`${pageId}-metadata-marker-remains`);
  if (countOccurrences(html, '<meta charset="UTF-8"') !== 1) {
    throw new Error(`${pageId}-charset-count`);
  }
  assertSingleTagValue(
    html,
    /<meta\b[^>]*\bname\s*=\s*(["'])viewport\1[^>]*>/gi,
    'content',
    'width=device-width, initial-scale=1.0',
    `${pageId}-viewport`,
  );
  assertSingleTagValue(
    html,
    /<meta\b[^>]*\bname\s*=\s*(["'])color-scheme\1[^>]*>/gi,
    'content',
    'dark',
    `${pageId}-color-scheme`,
  );
  assertSingleTagValue(
    html,
    /<meta\b[^>]*\bname\s*=\s*(["'])theme-color\1[^>]*>/gi,
    'content',
    '#08111F',
    `${pageId}-theme-color`,
  );
  const titles = [...html.matchAll(/<title>([\s\S]*?)<\/title>/gi)];
  if (titles.length !== 1 || titles[0][1] !== metadata.title) throw new Error(`${pageId}-title`);
  assertSingleTagValue(html, /<meta\b[^>]*\bname\s*=\s*(["'])description\1[^>]*>/gi, 'content', metadata.description, `${pageId}-description`);
  assertSingleTagValue(html, /<link\b[^>]*\brel\s*=\s*(["'])canonical\1[^>]*>/gi, 'href', metadata.canonicalUrl, `${pageId}-canonical`);
  assertSingleTagValue(html, /<link\b[^>]*\brel\s*=\s*(["'])icon\1[^>]*>/gi, 'href', '/favicon.svg', `${pageId}-favicon`);
  assertSingleTagValue(html, /<link\b[^>]*\brel\s*=\s*(["'])apple-touch-icon\1[^>]*>/gi, 'href', '/apple-touch-icon.png', `${pageId}-apple-icon`);

  const propertyValues = {
    'og:type': 'website',
    'og:url': metadata.canonicalUrl,
    'og:title': metadata.title,
    'og:description': metadata.description,
    'og:image': metadata.socialImageUrl,
    'og:image:width': '1200',
    'og:image:height': '630',
    'og:image:alt': metadata.socialImageAlt,
  };
  for (const [property, expected] of Object.entries(propertyValues)) {
    const escaped = property.replace(':', '\\:');
    assertSingleTagValue(html, new RegExp(`<meta\\b[^>]*\\bproperty\\s*=\\s*(["'])${escaped}\\1[^>]*>`, 'gi'), 'content', expected, `${pageId}-${property}`);
  }
  const nameValues = {
    'twitter:card': 'summary_large_image',
    'twitter:title': metadata.title,
    'twitter:description': metadata.description,
    'twitter:image': metadata.socialImageUrl,
    'twitter:image:alt': metadata.socialImageAlt,
  };
  for (const [name, expected] of Object.entries(nameValues)) {
    const escaped = name.replace(':', '\\:');
    assertSingleTagValue(html, new RegExp(`<meta\\b[^>]*\\bname\\s*=\\s*(["'])${escaped}\\1[^>]*>`, 'gi'), 'content', expected, `${pageId}-${name}`);
  }
  if (/<meta\b[^>]*\bname\s*=\s*(["'])(?:keywords|twitter:site|twitter:creator)\1/i.test(html)) {
    throw new Error(`${pageId}-forbidden-metadata`);
  }
  if (/<link\b[^>]*\brel\s*=\s*(["'])manifest\1/i.test(html) || /react-helmet/i.test(html)) {
    throw new Error(`${pageId}-runtime-or-pwa-metadata`);
  }
  const jsonLd = extractJsonLd(html, pageId);
  return { pageId, ...metadata, jsonLd };
}

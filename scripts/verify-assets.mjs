import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { basename, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { inspectArtifactText } from '../src/validation/privacy.js';
import {
  approvedDistPaths,
  approvedPublicPaths,
  candidateAssets,
  candidateDirectory,
  candidateFilenames,
  createFaviconSvg,
  createSocialCardDocument,
  distDirectory,
  palette,
  publicCandidateAssets,
  publicDirectory,
  socialCardCopy,
} from './assets/manifest.mjs';
import { approvedCrawlDistPaths } from './static/manifest.mjs';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const SAFE_PNG_ANCILLARY_CHUNKS = new Set(['cHRM', 'gAMA', 'sRGB']);
const PNG_METADATA_CHUNKS = new Set(['eXIf', 'iTXt', 'pHYs', 'tEXt', 'tIME', 'zTXt']);
const JPEG_SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2]);
const JPEG_STANDALONE_MARKERS = new Set([0x01, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7]);
const APPROVED_CHROMIUM_ICC_SHA256 = 'c3bb12de30d7357252ec3a5ec781bd2f8a6dd8c69dd7d3de97bbac262d9e1fd4';
const EXACT_EXTENSIONS = Object.freeze({ svg: '.svg', png: '.png', jpeg: '.jpg' });
const ALLOWED_SVG_ELEMENTS = new Set(['svg', 'rect', 'path', 'circle']);
const ALLOWED_SVG_ATTRIBUTES = Object.freeze({
  svg: new Set(['xmlns', 'viewBox', 'aria-hidden']),
  rect: new Set(['x', 'y', 'width', 'height', 'rx', 'fill', 'stroke', 'stroke-width']),
  path: new Set(['d', 'fill', 'stroke', 'stroke-width', 'stroke-linecap']),
  circle: new Set(['cx', 'cy', 'r', 'fill']),
});
const NUMERIC_SVG_ATTRIBUTES = new Set([
  'x',
  'y',
  'width',
  'height',
  'rx',
  'stroke-width',
  'cx',
  'cy',
  'r',
]);
const SVG_PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz0-9+., \-]+$/;
const EXTERNAL_REFERENCE = /(?:https?|ftp|file):|\/\/|\bwww\./i;
const SIGNED_URL_MARKER = /[?&#](?:expires?|signature|sig|token|key|credential)=/i;
const EMAIL_ADDRESS = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const EMPLOYER_REFERENCE = /\b(?:Ayming|VroomVroom)\b/i;
const PROHIBITED_ASSET_MARKER = /\b(?:certificate|credential-id|cv|emailjs|firebase|glb|mymind|recovery|résumé|resume)\b/i;
const ALLOWED_NON_ASSET_DIST_PATHS = Object.freeze([
  /^index\.html$/,
  /^projects\/index\.html$/,
  /^assets\/[^/]+\.(?:css|js)$/,
]);
const APPROVED_CRAWL_DIST_PATHS = new Set(approvedCrawlDistPaths);

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let current = value;
  for (let bit = 0; bit < 8; bit += 1) {
    current = (current & 1) === 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
  }
  return current >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function encodePngChunk(type, data = Buffer.alloc(0)) {
  if (!/^[A-Za-z]{4}$/.test(type)) throw new Error('PNG chunk type must be four ASCII letters.');
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

export function assertAssetPrivacy(text, filename) {
  const reviewText = text.replaceAll('http://www.w3.org/2000/svg', '');
  const rules = inspectArtifactText(reviewText);
  if (rules.length > 0) throw new Error(`${rules.sort()[0]}: ${filename}`);
  if (EMAIL_ADDRESS.test(reviewText)) throw new Error(`email-address: ${filename}`);
  if (SIGNED_URL_MARKER.test(reviewText)) throw new Error(`signed-or-expiring-url: ${filename}`);
  if (EXTERNAL_REFERENCE.test(reviewText)) throw new Error(`external-reference: ${filename}`);
  if (EMPLOYER_REFERENCE.test(reviewText)) throw new Error(`employer-reference: ${filename}`);
  if (PROHIBITED_ASSET_MARKER.test(reviewText)) throw new Error(`private-asset-marker: ${filename}`);
}

function parseAttributes(source, elementName) {
  const attributes = new Map();
  const attributePattern = /([A-Za-z_:][\w:.-]*)\s*=\s*(["'])(.*?)\2/g;
  let match;
  let remainder = source;
  while ((match = attributePattern.exec(source))) {
    if (attributes.has(match[1])) throw new Error(`duplicate-svg-attribute: ${elementName}`);
    attributes.set(match[1], match[3]);
    remainder = remainder.replace(match[0], '');
  }
  if (remainder.replaceAll('/', '').trim()) throw new Error(`invalid-svg-attribute: ${elementName}`);
  for (const [name, value] of attributes) {
    if (!ALLOWED_SVG_ATTRIBUTES[elementName].has(name)) {
      throw new Error(`disallowed-svg-attribute: ${elementName}`);
    }
    if (/^on/i.test(name) || /url\s*\(|javascript:|data:/i.test(value)) {
      throw new Error(`unsafe-svg-attribute: ${elementName}`);
    }
    if (NUMERIC_SVG_ATTRIBUTES.has(name) && !/^-?\d+(?:\.\d+)?$/.test(value)) {
      throw new Error(`non-numeric-svg-geometry: ${elementName}`);
    }
    if (name === 'd' && !SVG_PATH_DATA.test(value)) throw new Error('invalid-svg-path-data');
    if (name === 'fill' || name === 'stroke') {
      if (value !== 'none' && !Object.values(palette).includes(value)) {
        throw new Error(`unapproved-svg-colour: ${elementName}`);
      }
    }
  }
  return attributes;
}

export function verifySvgText(svg, { requireExactComposition = false } = {}) {
  if (typeof svg !== 'string' || Buffer.byteLength(svg, 'utf8') === 0) {
    throw new Error('empty-svg');
  }
  if (/<!--|<!DOCTYPE|<\?|<!\[CDATA\[|<metadata\b|<script\b|<style\b|<text\b|<foreignObject\b/i.test(svg)) {
    throw new Error('disallowed-svg-content');
  }
  if (/\b(?:href|filter|mask|clip-path|class|id)\s*=/i.test(svg)) {
    throw new Error('disallowed-svg-reference');
  }
  if (!/^<svg\b[\s\S]*<\/svg>\s*$/.test(svg)) throw new Error('invalid-svg-root');

  const tagPattern = /<(\/)?([A-Za-z][\w:-]*)([^>]*)>/g;
  const counts = new Map();
  let match;
  let closingSvgCount = 0;
  while ((match = tagPattern.exec(svg))) {
    const closing = Boolean(match[1]);
    const name = match[2];
    if (!ALLOWED_SVG_ELEMENTS.has(name)) throw new Error(`disallowed-svg-element: ${name}`);
    if (closing) {
      if (name !== 'svg') throw new Error(`unexpected-svg-closing-tag: ${name}`);
      closingSvgCount += 1;
      continue;
    }
    if (name !== 'svg' && !match[0].endsWith('/>')) throw new Error(`unclosed-svg-element: ${name}`);
    const attributes = parseAttributes(match[3], name);
    counts.set(name, (counts.get(name) ?? 0) + 1);
    if (name === 'svg') {
      if (attributes.get('xmlns') !== 'http://www.w3.org/2000/svg') throw new Error('invalid-svg-namespace');
      if (attributes.get('viewBox') !== '0 0 64 64') throw new Error('invalid-svg-viewbox');
      if (attributes.get('aria-hidden') !== 'true') throw new Error('invalid-svg-accessibility-contract');
    }
  }
  if ((counts.get('svg') ?? 0) !== 1 || closingSvgCount !== 1) throw new Error('invalid-svg-root-count');
  if ((counts.get('rect') ?? 0) !== 1 || (counts.get('path') ?? 0) !== 3 || (counts.get('circle') ?? 0) !== 3) {
    throw new Error('invalid-system-mark-geometry');
  }
  if (svg.replace(tagPattern, '').trim()) throw new Error('visible-svg-text');
  assertAssetPrivacy(svg.replaceAll(/\sd=(["'])(.*?)\1/g, ' d=""'), 'favicon.svg');
  if (requireExactComposition && svg !== createFaviconSvg()) throw new Error('unapproved-svg-composition');
  return { format: 'svg', width: 64, height: 64, opaque: false };
}

function decodeHtmlEntities(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

function verifySocialDocument(copyKey, document) {
  const expectedLines = socialCardCopy[copyKey];
  const matches = [...document.matchAll(/<p data-approved-line="(\d+)">([\s\S]*?)<\/p>/g)];
  if (matches.length !== expectedLines.length) throw new Error(`social-copy-line-count: ${copyKey}`);
  const actualLines = matches.map((match, index) => {
    if (Number(match[1]) !== index + 1 || /<[^>]+>/.test(match[2])) {
      throw new Error(`invalid-social-copy-markup: ${copyKey}`);
    }
    return decodeHtmlEntities(match[2]);
  });
  if (actualLines.some((line, index) => line !== expectedLines[index])) {
    throw new Error(`unapproved-social-copy: ${copyKey}`);
  }
  const body = document.match(/<body>([\s\S]*)<\/body>/)?.[1];
  if (!body) throw new Error(`missing-social-body: ${copyKey}`);
  const visibleText = decodeHtmlEntities(
    body
      .replaceAll(/<svg\b[\s\S]*?<\/svg>/g, '')
      .replaceAll(/<[^>]+>/g, ' '),
  )
    .replaceAll(/\s+/g, ' ')
    .trim();
  if (visibleText !== expectedLines.join(' ')) throw new Error(`extra-visible-social-copy: ${copyKey}`);
  if (!document.includes('padding:90px')) throw new Error(`social-safe-area: ${copyKey}`);
  if (/<(?:img|iframe|video|canvas|script|link)\b/i.test(document)) {
    throw new Error(`disallowed-social-resource: ${copyKey}`);
  }
  assertAssetPrivacy(expectedLines.join('\n'), `${copyKey}-og.jpg`);
  const withoutNamespace = document.replaceAll('http://www.w3.org/2000/svg', '');
  if (EXTERNAL_REFERENCE.test(withoutNamespace) || SIGNED_URL_MARKER.test(withoutNamespace)) {
    throw new Error(`external-social-resource: ${copyKey}`);
  }
  return actualLines;
}

export function verifyApprovedCompositions({
  faviconSvg = createFaviconSvg(),
  socialDocuments = {
    home: createSocialCardDocument('home'),
    projects: createSocialCardDocument('projects'),
  },
} = {}) {
  verifySvgText(faviconSvg, { requireExactComposition: true });
  return {
    favicon: 'verified',
    home: verifySocialDocument('home', socialDocuments.home),
    projects: verifySocialDocument('projects', socialDocuments.projects),
  };
}

export function validateAssetManifest(definitions = candidateAssets) {
  if (!Array.isArray(definitions)) throw new Error('asset-manifest-must-be-an-array');
  const expected = [...candidateFilenames].sort();
  const filenames = definitions.map(({ filename }) => filename);
  if (new Set(filenames).size !== filenames.length) throw new Error('duplicate-asset-destination');
  if (filenames.length !== expected.length || [...filenames].sort().some((name, index) => name !== expected[index])) {
    throw new Error('unexpected-asset-manifest-entry');
  }
  for (const definition of definitions) {
    assertSafeCandidateFilename(definition.filename);
    if (!['svg', 'png', 'jpeg'].includes(definition.format)) throw new Error('unsupported-asset-format');
    if (extname(definition.filename).toLowerCase() !== EXACT_EXTENSIONS[definition.format]) {
      throw new Error(`asset-extension-mismatch: ${definition.filename}`);
    }
    if (!Number.isInteger(definition.width) || !Number.isInteger(definition.height)) {
      throw new Error(`invalid-asset-dimensions: ${definition.filename}`);
    }
    if (!Number.isInteger(definition.maxBytes) || definition.maxBytes < 1) {
      throw new Error(`invalid-asset-budget: ${definition.filename}`);
    }
  }
  return definitions;
}

export function validatePublishedAssetManifest(definitions = publicCandidateAssets) {
  if (!Array.isArray(definitions)) throw new Error('published-asset-manifest-must-be-an-array');
  if (definitions.length !== publicCandidateAssets.length) {
    throw new Error('unexpected-published-asset-manifest-entry');
  }
  const publicPaths = definitions.map(({ publicPath }) => publicPath);
  const distPaths = definitions.map(({ distPath }) => distPath);
  if (new Set(publicPaths).size !== publicPaths.length || new Set(distPaths).size !== distPaths.length) {
    throw new Error('duplicate-published-asset-destination');
  }
  for (let index = 0; index < definitions.length; index += 1) {
    const definition = definitions[index];
    const approved = publicCandidateAssets[index];
    const definitionKeys = Object.keys(definition).sort();
    const approvedKeys = Object.keys(approved).sort();
    if (
      definitionKeys.length !== approvedKeys.length ||
      definitionKeys.some((key, keyIndex) => key !== approvedKeys[keyIndex]) ||
      approvedKeys.some((field) => definition[field] !== approved[field])
    ) {
      throw new Error('unexpected-published-asset-manifest-entry');
    }
    assertSafePublishedAssetPath(definition.publicPath, approvedPublicPaths);
    assertSafePublishedAssetPath(definition.distPath, approvedDistPaths);
    if (!/^[a-f0-9]{64}$/.test(definition.approvedSha256)) {
      throw new Error(`invalid-approved-asset-hash: ${definition.filename}`);
    }
  }
  return definitions;
}

export function assertSafeCandidateFilename(filename) {
  if (
    typeof filename !== 'string' ||
    filename !== basename(filename) ||
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('..') ||
    /[?#:%]/.test(filename) ||
    !candidateFilenames.includes(filename)
  ) {
    throw new Error('unsafe-candidate-path');
  }
  return filename;
}

export function resolveCandidatePath(root, filename) {
  assertSafeCandidateFilename(filename);
  const resolvedRoot = resolve(root);
  const path = resolve(resolvedRoot, filename);
  if (path === resolvedRoot || !path.startsWith(`${resolvedRoot}${sep}`)) {
    throw new Error('candidate-path-escapes-root');
  }
  return path;
}

export function assertSafePublishedAssetPath(relativePath, allowlist) {
  if (
    typeof relativePath !== 'string' ||
    relativePath.length === 0 ||
    relativePath.startsWith('/') ||
    relativePath.includes('\\') ||
    relativePath.split('/').some((segment) => !segment || segment === '.' || segment === '..') ||
    /[?#:%]/.test(relativePath) ||
    !allowlist.includes(relativePath)
  ) {
    throw new Error('unsafe-published-asset-path');
  }
  return relativePath;
}

export function resolvePublishedAssetPath(root, relativePath, allowlist) {
  assertSafePublishedAssetPath(relativePath, allowlist);
  const resolvedRoot = resolve(root);
  const path = resolve(resolvedRoot, ...relativePath.split('/'));
  if (path === resolvedRoot || !path.startsWith(`${resolvedRoot}${sep}`)) {
    throw new Error('published-asset-path-escapes-root');
  }
  return path;
}

function parsePng(buffer) {
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('png-signature');
  }
  let offset = 8;
  let ihdr;
  let sawIend = false;
  const idat = [];
  const chunks = [];
  let transparency = null;
  while (offset < buffer.length) {
    if (offset + 12 > buffer.length) throw new Error('truncated-png-chunk');
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;
    if (!/^[A-Za-z]{4}$/.test(type) || chunkEnd > buffer.length) throw new Error('invalid-png-chunk');
    const expectedCrc = buffer.readUInt32BE(dataEnd);
    const actualCrc = crc32(buffer.subarray(offset + 4, dataEnd));
    if (expectedCrc !== actualCrc) throw new Error(`png-crc: ${type}`);
    const data = buffer.subarray(dataStart, dataEnd);
    chunks.push(type);
    if (PNG_METADATA_CHUNKS.has(type)) throw new Error(`png-metadata-chunk: ${type}`);
    if (type === 'IHDR') {
      if (ihdr || length !== 13 || chunks.length !== 1) throw new Error('invalid-png-ihdr');
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12],
      };
      if (ihdr.compression !== 0 || ihdr.filter !== 0 || ihdr.interlace !== 0) {
        throw new Error('unsupported-png-encoding');
      }
    } else if (type === 'IDAT') {
      if (!ihdr || sawIend) throw new Error('invalid-png-idat-order');
      idat.push(data);
    } else if (type === 'tRNS') {
      transparency = data;
    } else if (type === 'IEND') {
      if (length !== 0 || sawIend || chunkEnd !== buffer.length) throw new Error('png-trailing-data');
      sawIend = true;
    } else if (!['PLTE'].includes(type) && !SAFE_PNG_ANCILLARY_CHUNKS.has(type)) {
      throw new Error(`unapproved-png-chunk: ${type}`);
    }
    offset = chunkEnd;
  }
  if (!ihdr || idat.length === 0 || !sawIend) throw new Error('incomplete-png');
  return { ...ihdr, chunks, idat: Buffer.concat(idat), transparency };
}

function paeth(left, above, upperLeft) {
  const prediction = left + above - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const aboveDistance = Math.abs(prediction - above);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

function isPngOpaque(png) {
  if ([0, 2].includes(png.colorType)) return png.transparency === null;
  if (png.colorType === 3) return png.transparency === null;
  if (![4, 6].includes(png.colorType) || png.bitDepth !== 8) return false;
  const channels = png.colorType === 4 ? 2 : 4;
  const rowBytes = png.width * channels;
  const inflated = inflateSync(png.idat);
  if (inflated.length !== (rowBytes + 1) * png.height) throw new Error('png-pixel-data-length');
  let previous = Buffer.alloc(rowBytes);
  let cursor = 0;
  for (let rowIndex = 0; rowIndex < png.height; rowIndex += 1) {
    const filter = inflated[cursor];
    cursor += 1;
    const encoded = inflated.subarray(cursor, cursor + rowBytes);
    cursor += rowBytes;
    const decoded = Buffer.alloc(rowBytes);
    for (let index = 0; index < rowBytes; index += 1) {
      const left = index >= channels ? decoded[index - channels] : 0;
      const above = previous[index] ?? 0;
      const upperLeft = index >= channels ? previous[index - channels] : 0;
      const predictor =
        filter === 0
          ? 0
          : filter === 1
            ? left
            : filter === 2
              ? above
              : filter === 3
                ? Math.floor((left + above) / 2)
                : filter === 4
                  ? paeth(left, above, upperLeft)
                  : null;
      if (predictor === null) throw new Error('unsupported-png-filter');
      decoded[index] = (encoded[index] + predictor) & 0xff;
    }
    for (let index = channels - 1; index < rowBytes; index += channels) {
      if (decoded[index] !== 255) return false;
    }
    previous = decoded;
  }
  return true;
}

function parseJpeg(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) throw new Error('jpeg-signature');
  let offset = 2;
  let dimensions = null;
  let sawScan = false;
  let sawApprovedIccProfile = false;
  const markers = [];
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) throw new Error('invalid-jpeg-marker-boundary');
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xd9) {
      if (!dimensions || !sawScan || offset !== buffer.length) throw new Error('jpeg-trailing-or-incomplete-data');
      return { ...dimensions, markers };
    }
    if (JPEG_STANDALONE_MARKERS.has(marker)) throw new Error('unexpected-jpeg-standalone-marker');
    if (offset + 2 > buffer.length) throw new Error('truncated-jpeg-segment');
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) throw new Error('invalid-jpeg-segment-length');
    const dataStart = offset + 2;
    const dataEnd = offset + length;
    const data = buffer.subarray(dataStart, dataEnd);
    markers.push(marker);
    if (marker === 0xfe) throw new Error('jpeg-comment');
    if (marker === 0xe1 || marker === 0xed) throw new Error('jpeg-private-metadata');
    if (marker >= 0xe0 && marker <= 0xef) {
      if (marker === 0xe0) {
        if (data.length !== 14 || data.toString('ascii', 0, 5) !== 'JFIF\0') throw new Error('invalid-jpeg-jfif');
        if (data[12] !== 0 || data[13] !== 0) throw new Error('jpeg-thumbnail');
      } else if (marker === 0xe2) {
        const profile = data.subarray(14);
        const approvedProfile =
          !sawApprovedIccProfile &&
          data.length === 470 &&
          data.subarray(0, 12).equals(Buffer.from('ICC_PROFILE\0', 'ascii')) &&
          data[12] === 1 &&
          data[13] === 1 &&
          profile.readUInt32BE(0) === profile.length &&
          profile.toString('ascii', 36, 40) === 'acsp' &&
          createHash('sha256').update(data).digest('hex') === APPROVED_CHROMIUM_ICC_SHA256;
        if (!approvedProfile) throw new Error('unapproved-jpeg-app-segment');
        sawApprovedIccProfile = true;
      } else {
        throw new Error('unapproved-jpeg-app-segment');
      }
    }
    if (JPEG_SOF_MARKERS.has(marker)) {
      if (data.length < 6 || dimensions) throw new Error('invalid-jpeg-sof');
      dimensions = { height: data.readUInt16BE(1), width: data.readUInt16BE(3) };
    }
    offset = dataEnd;
    if (marker === 0xda) {
      sawScan = true;
      while (offset < buffer.length - 1) {
        if (buffer[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        const next = buffer[offset + 1];
        if (next === 0x00 || (next >= 0xd0 && next <= 0xd7)) {
          offset += 2;
          continue;
        }
        break;
      }
    }
  }
  throw new Error('missing-jpeg-eoi');
}

export function verifyCandidateBuffer(buffer, definition) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error(`empty-asset: ${definition.filename}`);
  if (buffer.length > definition.maxBytes) throw new Error(`asset-byte-budget: ${definition.filename}`);
  let parsed;
  if (definition.format === 'svg') {
    const text = buffer.toString('utf8');
    if (text.includes('\uFFFD') || !Buffer.from(text, 'utf8').equals(buffer)) throw new Error('invalid-svg-encoding');
    parsed = verifySvgText(text, { requireExactComposition: definition.filename === 'favicon.svg' });
  } else if (definition.format === 'png') {
    const png = parsePng(buffer);
    parsed = { format: 'png', width: png.width, height: png.height, opaque: isPngOpaque(png) };
  } else if (definition.format === 'jpeg') {
    const jpeg = parseJpeg(buffer);
    parsed = { format: 'jpeg', width: jpeg.width, height: jpeg.height, opaque: true };
  } else {
    throw new Error(`unsupported-asset-format: ${definition.filename}`);
  }
  if (parsed.width !== definition.width || parsed.height !== definition.height) {
    throw new Error(`asset-dimensions: ${definition.filename}`);
  }
  if (definition.requireOpaque && !parsed.opaque) throw new Error(`asset-transparency: ${definition.filename}`);
  return {
    filename: definition.filename,
    format: definition.format,
    width: parsed.width,
    height: parsed.height,
    bytes: buffer.length,
    opaque: parsed.opaque,
    sha256: createHash('sha256').update(buffer).digest('hex'),
  };
}

async function assertRegularAssetPath(root, relativePath, allowlist) {
  const resolvedRoot = resolve(root);
  const rootStat = await lstat(resolvedRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error('published-asset-root-must-be-a-real-directory');
  }
  const segments = assertSafePublishedAssetPath(relativePath, allowlist).split('/');
  let current = resolvedRoot;
  for (let index = 0; index < segments.length; index += 1) {
    current = resolve(current, segments[index]);
    const currentStat = await lstat(current);
    if (currentStat.isSymbolicLink()) throw new Error(`published-asset-symlink: ${relativePath}`);
    const isLast = index === segments.length - 1;
    if ((!isLast && !currentStat.isDirectory()) || (isLast && !currentStat.isFile())) {
      throw new Error(`published-asset-must-be-a-regular-file: ${relativePath}`);
    }
  }
  return current;
}

async function verifyPublishedAssetSet({ directory, definitions, pathKey, allowlist }) {
  validatePublishedAssetManifest(definitions);
  const results = [];
  for (const definition of definitions) {
    const relativePath = definition[pathKey];
    const path = await assertRegularAssetPath(directory, relativePath, allowlist);
    const result = verifyCandidateBuffer(await readFile(path), definition);
    if (result.sha256 !== definition.approvedSha256) {
      throw new Error(`approved-asset-hash-mismatch: ${relativePath}`);
    }
    results.push({ ...result, path: relativePath });
  }
  return results;
}

async function listRegularFiles(directory, root = resolve(directory)) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`dist-symbolic-link: ${entry.name}`);
    if (entry.isDirectory()) files.push(...(await listRegularFiles(path, root)));
    else if (entry.isFile()) files.push(path.slice(root.length + 1).replaceAll('\\', '/'));
    else throw new Error(`dist-non-regular-entry: ${entry.name}`);
  }
  return files;
}

export async function verifyPublicAssets({
  directory = publicDirectory,
  definitions = publicCandidateAssets,
} = {}) {
  verifyApprovedCompositions();
  return {
    status: 'verified',
    directory: resolve(directory),
    assets: await verifyPublishedAssetSet({
      directory,
      definitions,
      pathKey: 'publicPath',
      allowlist: approvedPublicPaths,
    }),
  };
}

export async function verifyDistAssets({
  directory = distDirectory,
  sourceDirectory = publicDirectory,
  definitions = publicCandidateAssets,
} = {}) {
  const assets = await verifyPublishedAssetSet({
    directory,
    definitions,
    pathKey: 'distPath',
    allowlist: approvedDistPaths,
  });
  const sourceAssets = await verifyPublishedAssetSet({
    directory: sourceDirectory,
    definitions,
    pathKey: 'publicPath',
    allowlist: approvedPublicPaths,
  });
  for (let index = 0; index < definitions.length; index += 1) {
    const distBuffer = await readFile(
      resolvePublishedAssetPath(directory, definitions[index].distPath, approvedDistPaths),
    );
    const sourceBuffer = await readFile(
      resolvePublishedAssetPath(sourceDirectory, definitions[index].publicPath, approvedPublicPaths),
    );
    if (!distBuffer.equals(sourceBuffer) || assets[index].sha256 !== sourceAssets[index].sha256) {
      throw new Error(`source-dist-asset-mismatch: ${definitions[index].distPath}`);
    }
  }
  const files = (await listRegularFiles(resolve(directory))).sort();
  const expectedAssetPaths = new Set(approvedDistPaths);
  for (const file of files) {
    if (expectedAssetPaths.has(file)) continue;
    if (APPROVED_CRAWL_DIST_PATHS.has(file)) continue;
    if (!ALLOWED_NON_ASSET_DIST_PATHS.some((pattern) => pattern.test(file))) {
      throw new Error(`unexpected-dist-asset: ${file}`);
    }
  }
  if (assets.length !== approvedDistPaths.length) throw new Error('missing-dist-asset');
  return { status: 'verified', directory: resolve(directory), assets, files };
}

export async function verifyCandidateDirectory({
  directory = candidateDirectory,
  definitions = candidateAssets,
} = {}) {
  validateAssetManifest(definitions);
  verifyApprovedCompositions();
  const root = resolve(directory);
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('candidate-root-must-be-a-real-directory');
  const entries = await readdir(root, { withFileTypes: true });
  const actualNames = entries.map(({ name }) => name).sort();
  const expectedNames = definitions.map(({ filename }) => filename).sort();
  if (actualNames.length !== expectedNames.length || actualNames.some((name, index) => name !== expectedNames[index])) {
    throw new Error('candidate-directory-inventory');
  }
  const results = [];
  for (const definition of definitions) {
    const path = resolveCandidatePath(root, definition.filename);
    const entry = entries.find(({ name }) => name === definition.filename);
    const fileStat = await lstat(path);
    if (!entry?.isFile() || entry.isSymbolicLink() || !fileStat.isFile() || fileStat.isSymbolicLink()) {
      throw new Error(`candidate-must-be-a-regular-file: ${definition.filename}`);
    }
    results.push(verifyCandidateBuffer(await readFile(path), definition));
  }
  return { status: 'verified', directory: root, assets: results };
}

const isCommandLine = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCommandLine) {
  if (process.argv.length > 2) throw new Error('The public asset verifier accepts no path override.');
  console.log(JSON.stringify(await verifyPublicAssets(), null, 2));
}

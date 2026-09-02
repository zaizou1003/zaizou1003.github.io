import { lstat, readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { gzipSync, constants as zlibConstants } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import {
  EXPECTED_LOGICAL_BUILD_ASSETS,
  verifyDistribution,
} from './verify-dist.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const defaultDistDirectory = resolve(repositoryRoot, 'dist');

export const PAGE_BUDGETS = Object.freeze({
  javascript: 102400,
  css: 30720,
});

const PAGE_LOGICAL_ASSETS = Object.freeze({
  home: Object.freeze(['home.js', 'hydrateNavigation.css', 'hydrateNavigation.js']),
  projects: Object.freeze([
    'hydrateNavigation.css',
    'hydrateNavigation.js',
    'projects.css',
    'projects.js',
  ]),
});

const BUILD_ASSET_PATTERN = /^assets\/(home|projects|hydrateNavigation)-[A-Za-z0-9_-]{6,}\.(css|js)$/;

function logicalAssetName(path) {
  const match = path.match(BUILD_ASSET_PATTERN);
  if (!match || /[?#\\%]/.test(path) || path.includes('..')) {
    throw new Error('invalid-budget-asset-reference');
  }
  const name = `${match[1]}.${match[2]}`;
  if (!EXPECTED_LOGICAL_BUILD_ASSETS.includes(name)) {
    throw new Error('untrusted-budget-asset-reference');
  }
  return name;
}

function resolveTrustedAsset(distDirectory, path) {
  if (typeof path !== 'string' || path.startsWith('/') || /[?#\\%]/.test(path)) {
    throw new Error('invalid-budget-asset-reference');
  }
  const file = resolve(distDirectory, path);
  if (!file.startsWith(`${resolve(distDirectory)}${sep}`)) {
    throw new Error('budget-asset-traversal');
  }
  return file;
}

export function validatePageAssetGraph(pageAssets) {
  if (!pageAssets || Object.keys(pageAssets).sort().join(',') !== 'home,projects') {
    throw new Error('invalid-budget-page-graph');
  }
  for (const [pageId, expectedNames] of Object.entries(PAGE_LOGICAL_ASSETS)) {
    const assets = pageAssets[pageId];
    if (!Array.isArray(assets)) throw new Error(`missing-budget-page-assets: ${pageId}`);
    const names = [];
    const paths = new Set();
    for (const asset of assets) {
      if (!asset || Object.keys(asset).sort().join(',') !== 'path,role') {
        throw new Error(`invalid-budget-asset-record: ${pageId}`);
      }
      if (paths.has(asset.path)) throw new Error(`duplicate-budget-asset: ${pageId}`);
      paths.add(asset.path);
      const name = logicalAssetName(asset.path);
      const expectedRole = extname(asset.path) === '.js' ? 'javascript' : 'css';
      if (asset.role !== expectedRole) throw new Error(`wrong-budget-asset-role: ${pageId}`);
      names.push(name);
    }
    if (JSON.stringify(names.sort()) !== JSON.stringify([...expectedNames].sort())) {
      throw new Error(`wrong-budget-asset-attribution: ${pageId}`);
    }
  }
  return pageAssets;
}

export function deterministicGzipSize(buffer) {
  return gzipSync(buffer, {
    level: zlibConstants.Z_BEST_COMPRESSION,
    mtime: 0,
  }).byteLength;
}

export async function measureTrustedPageAssets({
  distDirectory = defaultDistDirectory,
  pageAssets,
} = {}) {
  validatePageAssetGraph(pageAssets);
  const pages = [];
  for (const pageId of ['home', 'projects']) {
    const measured = [];
    for (const asset of pageAssets[pageId]) {
      const file = resolveTrustedAsset(distDirectory, asset.path);
      const assetStat = await lstat(file);
      if (assetStat.isSymbolicLink()) throw new Error(`symlinked-budget-asset: ${asset.path}`);
      if (!assetStat.isFile()) throw new Error(`non-regular-budget-asset: ${asset.path}`);
      const buffer = await readFile(file);
      measured.push({
        path: asset.path,
        role: asset.role,
        rawBytes: buffer.byteLength,
        gzipBytes: deterministicGzipSize(buffer),
        limitBytes: PAGE_BUDGETS[asset.role],
      });
    }
    const totals = Object.fromEntries(
      Object.entries(PAGE_BUDGETS).map(([role, limitBytes]) => {
        const assets = measured.filter((asset) => asset.role === role);
        const rawBytes = assets.reduce((sum, asset) => sum + asset.rawBytes, 0);
        const gzipBytes = assets.reduce((sum, asset) => sum + asset.gzipBytes, 0);
        if (gzipBytes > limitBytes) throw new Error(`page-${role}-gzip-budget: ${pageId}`);
        return [role, { role, rawBytes, gzipBytes, limitBytes }];
      }),
    );
    pages.push({ page: pageId, assets: measured, totals });
  }
  return { status: 'verified', pages };
}

export async function checkDistributionBudgets({ distDirectory = defaultDistDirectory } = {}) {
  const distribution = await verifyDistribution({ distDirectory });
  return measureTrustedPageAssets({ distDirectory, pageAssets: distribution.pageAssets });
}

const isCommandLine = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCommandLine) console.log(JSON.stringify(await checkDistributionBudgets(), null, 2));

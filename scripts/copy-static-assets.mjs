import { copyFile, lstat, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  approvedDistPaths,
  approvedPublicPaths,
  distDirectory,
  publicCandidateAssets,
  publicDirectory,
} from './assets/manifest.mjs';
import {
  resolvePublishedAssetPath,
  validatePublishedAssetManifest,
  verifyDistAssets,
  verifyPublicAssets,
} from './verify-assets.mjs';

async function assertRealDirectory(path, label) {
  const pathStat = await lstat(path);
  if (!pathStat.isDirectory() || pathStat.isSymbolicLink()) {
    throw new Error(`${label}-must-be-a-real-directory`);
  }
}

async function ensureDestinationParent(destinationRoot, relativePath) {
  const destination = resolvePublishedAssetPath(destinationRoot, relativePath, approvedDistPaths);
  const parent = dirname(destination);
  if (parent === resolve(destinationRoot)) return destination;
  try {
    const parentStat = await lstat(parent);
    if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) {
      throw new Error(`dist-asset-parent-must-be-a-real-directory: ${relativePath}`);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await mkdir(parent, { recursive: false });
  }
  return destination;
}

async function assertSafeDestinationFile(destination, relativePath) {
  try {
    const destinationStat = await lstat(destination);
    if (!destinationStat.isFile() || destinationStat.isSymbolicLink()) {
      throw new Error(`dist-asset-destination-must-be-a-regular-file: ${relativePath}`);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

export async function copyStaticAssets({
  sourceDirectory = publicDirectory,
  destinationDirectory = distDirectory,
  definitions = publicCandidateAssets,
} = {}) {
  validatePublishedAssetManifest(definitions);
  await assertRealDirectory(resolve(sourceDirectory), 'public-asset-root');
  await assertRealDirectory(resolve(destinationDirectory), 'dist-asset-root');
  const sourceVerification = await verifyPublicAssets({
    directory: sourceDirectory,
    definitions,
  });

  const copied = [];
  for (const definition of definitions) {
    const source = resolvePublishedAssetPath(
      sourceDirectory,
      definition.publicPath,
      approvedPublicPaths,
    );
    const destination = await ensureDestinationParent(
      destinationDirectory,
      definition.distPath,
    );
    await assertSafeDestinationFile(destination, definition.distPath);
    await copyFile(source, destination);
    copied.push({
      source: definition.publicPath,
      destination: definition.distPath,
      sha256: definition.approvedSha256,
    });
  }

  const distVerification = await verifyDistAssets({
    directory: destinationDirectory,
    sourceDirectory,
    definitions,
  });
  return {
    status: 'copied-and-verified',
    sourceDirectory: resolve(sourceDirectory),
    destinationDirectory: resolve(destinationDirectory),
    copied,
    sourceAssets: sourceVerification.assets,
    distAssets: distVerification.assets,
  };
}

const isCommandLine = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCommandLine) {
  if (process.argv.length > 2) throw new Error('The static asset copier accepts no path override.');
  console.log(JSON.stringify(await copyStaticAssets(), null, 2));
}

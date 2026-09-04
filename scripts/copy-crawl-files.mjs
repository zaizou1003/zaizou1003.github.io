import { copyFile, lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  approvedCrawlDistPaths,
  approvedCrawlSourcePaths,
  crawlFiles,
  distDirectory,
  publicDirectory,
} from './static/manifest.mjs';
import {
  assertRegularCrawlPath,
  resolveCrawlPath,
  validateCrawlManifest,
  verifyCrawlSourceFiles,
  verifyDistCrawlFiles,
} from './verify-crawl-files.mjs';

async function assertDestinationRoot(path) {
  const pathStat = await lstat(resolve(path));
  if (!pathStat.isDirectory() || pathStat.isSymbolicLink()) {
    throw new Error('crawl-destination-root-real-directory');
  }
}

async function assertSafeDestination(destination, relativePath) {
  try {
    const pathStat = await lstat(destination);
    if (!pathStat.isFile() || pathStat.isSymbolicLink()) {
      throw new Error(`crawl-destination-not-regular: ${relativePath}`);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

export async function copyCrawlFiles({
  sourceDirectory = publicDirectory,
  destinationDirectory = distDirectory,
  definitions = crawlFiles,
} = {}) {
  validateCrawlManifest(definitions);
  await assertDestinationRoot(destinationDirectory);
  const sourceVerification = await verifyCrawlSourceFiles({
    directory: sourceDirectory,
    definitions,
  });
  const copied = [];
  for (const definition of definitions) {
    const source = await assertRegularCrawlPath(
      sourceDirectory,
      definition.sourcePath,
      approvedCrawlSourcePaths,
    );
    const destination = resolveCrawlPath(
      destinationDirectory,
      definition.distPath,
      approvedCrawlDistPaths,
    );
    await assertSafeDestination(destination, definition.distPath);
    await copyFile(source, destination);
    copied.push({
      source: definition.sourcePath,
      destination: definition.distPath,
      sha256: definition.approvedSha256,
    });
  }
  const distVerification = await verifyDistCrawlFiles({
    directory: destinationDirectory,
    sourceDirectory,
    definitions,
  });
  return {
    status: 'copied-and-verified',
    sourceDirectory: resolve(sourceDirectory),
    destinationDirectory: resolve(destinationDirectory),
    copied,
    sourceFiles: sourceVerification.files,
    distFiles: distVerification.files,
  };
}

const isCommandLine = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCommandLine) {
  if (process.argv.length > 2) throw new Error('The crawl copier accepts no path override.');
  console.log(JSON.stringify(await copyCrawlFiles(), null, 2));
}

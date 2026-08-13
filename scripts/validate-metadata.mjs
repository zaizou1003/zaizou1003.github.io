import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { METADATA_PAGE_IDS, validateMetadataManifest } from './metadata/manifest.mjs';
import { transformPageHtml, verifyPageMetadataHtml } from './metadata/html-transform.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const sources = Object.freeze({
  home: resolve(repositoryRoot, 'index.html'),
  projects: resolve(repositoryRoot, 'projects/index.html'),
});

export async function validateMetadataSources() {
  validateMetadataManifest();
  const pages = [];
  for (const pageId of METADATA_PAGE_IDS) {
    const source = await readFile(sources[pageId], 'utf8');
    const transformed = transformPageHtml(source, pageId);
    const metadata = verifyPageMetadataHtml(transformed, pageId);
    pages.push({ id: pageId, title: metadata.title, canonicalUrl: metadata.canonicalUrl });
  }
  return { status: 'validated', pages };
}

const isCommandLine = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCommandLine) {
  if (process.argv.length > 2) throw new Error('The metadata validator accepts no arguments.');
  console.log(JSON.stringify(await validateMetadataSources(), null, 2));
}

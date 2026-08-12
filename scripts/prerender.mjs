import { readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { extractRootMarkup } from './verify-dist.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const prerenderDirectory = resolve(repositoryRoot, '.prerender');
const serverBundle = resolve(prerenderDirectory, 'server.mjs');
const injectionMarker = '<!--app-html-->';

const pages = [
  { id: 'home', output: resolve(repositoryRoot, 'dist/index.html') },
  { id: 'projects', output: resolve(repositoryRoot, 'dist/projects/index.html') },
];

function countOccurrences(source, searchValue) {
  return source.split(searchValue).length - 1;
}

function assertRenderableMarkup(pageId, markup) {
  const withoutComments = markup.replaceAll(/<!--[\s\S]*?-->/g, '').trim();

  if (!withoutComments || !/<main(?:\s|>)/i.test(withoutComments)) {
    throw new Error(`Static render for ${pageId} is empty or missing its main landmark.`);
  }

  if (!/<h1(?:\s|>)/i.test(withoutComments) || !/<nav(?:\s|>)/i.test(withoutComments)) {
    throw new Error(`Static render for ${pageId} is missing its heading or navigation.`);
  }
}

try {
  const serverModule = await import(`${pathToFileURL(serverBundle).href}?v=${Date.now()}`);

  if (typeof serverModule.renderPage !== 'function') {
    throw new Error('The prerender server bundle does not export renderPage(pageId).');
  }

  const renderedPages = [];

  for (const page of pages) {
    const template = await readFile(page.output, 'utf8');
    extractRootMarkup(template, page.output);
    const markerCount = countOccurrences(template, injectionMarker);

    if (markerCount !== 1) {
      throw new Error(
        `${page.output} must contain exactly one ${injectionMarker} marker; found ${markerCount}.`,
      );
    }

    const markup = serverModule.renderPage(page.id);
    const repeatedMarkup = serverModule.renderPage(page.id);
    if (markup !== repeatedMarkup) {
      throw new Error(`Static render for ${page.id} is not deterministic.`);
    }
    assertRenderableMarkup(page.id, markup);
    const html = template.replace(injectionMarker, markup);
    const injectedMarkup = extractRootMarkup(html, page.output);
    if (injectedMarkup !== markup) {
      throw new Error(`Static render for ${page.id} escaped the exact #root boundary.`);
    }
    renderedPages.push({ ...page, html });
  }

  for (const page of renderedPages) {
    await writeFile(page.output, page.html, 'utf8');
    console.log(`Pre-rendered ${page.id}: ${page.output}`);
  }
} finally {
  await rm(prerenderDirectory, { recursive: true, force: true });
}

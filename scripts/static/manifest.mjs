import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));

export const repositoryRoot = resolve(scriptDirectory, '../..');
export const publicDirectory = resolve(repositoryRoot, 'public');
export const distDirectory = resolve(repositoryRoot, 'dist');

const defineCrawlFile = (definition) => Object.freeze(definition);

export const crawlFiles = Object.freeze([
  defineCrawlFile({
    role: 'robots',
    sourcePath: 'robots.txt',
    distPath: 'robots.txt',
    extension: '.txt',
    mimeType: 'text/plain',
    maxBytes: 256,
    approvedSha256: 'e3901357f2e64c8c98018cfffe06859700d6858161d7b5554e642787d0011fdd',
  }),
  defineCrawlFile({
    role: 'sitemap',
    sourcePath: 'sitemap.xml',
    distPath: 'sitemap.xml',
    extension: '.xml',
    mimeType: 'application/xml',
    maxBytes: 1024,
    approvedSha256: '77830e55473e09dd501c81267edc59adfedf2061d597ff55e15422fdad21edaa',
  }),
  defineCrawlFile({
    role: 'not-found',
    sourcePath: '404.html',
    distPath: '404.html',
    extension: '.html',
    mimeType: 'text/html',
    maxBytes: 12 * 1024,
    approvedSha256: 'be013a04c9419a57893cecca34863c5d79dc5b385484185c06544b06d908ebad',
  }),
]);

export const approvedCrawlSourcePaths = Object.freeze(
  crawlFiles.map(({ sourcePath }) => sourcePath),
);
export const approvedCrawlDistPaths = Object.freeze(
  crawlFiles.map(({ distPath }) => distPath),
);

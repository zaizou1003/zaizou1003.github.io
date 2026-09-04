import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { copyCrawlFiles } from '../../scripts/copy-crawl-files.mjs';
import {
  approvedCrawlDistPaths,
  approvedCrawlSourcePaths,
  crawlFiles,
} from '../../scripts/static/manifest.mjs';
import {
  EXACT_ROBOTS_TEXT,
  EXACT_SITEMAP_TEXT,
  assertRegularCrawlPath,
  assertSafeCrawlPath,
  validateCrawlManifest,
  verifyCrawlBuffer,
  verifyCrawlSourceFiles,
  verifyDistCrawlFiles,
  verifyNotFoundHtml,
  verifyRobotsText,
  verifySitemapText,
} from '../../scripts/verify-crawl-files.mjs';

const cloneDefinitions = () => crawlFiles.map((definition) => ({ ...definition }));

async function createSourceFixture() {
  const root = await mkdtemp(resolve(tmpdir(), 'crawl-source-'));
  for (const definition of crawlFiles) {
    await writeFile(
      resolve(root, definition.sourcePath),
      await readFile(resolve('public', definition.sourcePath)),
    );
  }
  return root;
}

test('crawl manifest is the exact separate three-file allowlist', () => {
  assert.equal(validateCrawlManifest(), true);
  assert.deepEqual(approvedCrawlSourcePaths, ['robots.txt', 'sitemap.xml', '404.html']);
  assert.deepEqual(approvedCrawlDistPaths, ['robots.txt', 'sitemap.xml', '404.html']);
  assert.deepEqual(crawlFiles.map(({ role }) => role), ['robots', 'sitemap', 'not-found']);
});

test('crawl manifest rejects missing, extra, duplicate, altered and mismatched entries', async (context) => {
  await context.test('missing', () =>
    assert.throws(() => validateCrawlManifest(cloneDefinitions().slice(0, 2)), /unexpected/),
  );
  await context.test('extra', () =>
    assert.throws(() => validateCrawlManifest([...cloneDefinitions(), cloneDefinitions()[0]]), /unexpected/),
  );
  await context.test('duplicate', () => {
    const fixture = cloneDefinitions();
    fixture[1] = { ...fixture[0] };
    assert.throws(() => validateCrawlManifest(fixture), /unexpected|duplicate/);
  });
  await context.test('hash drift', () => {
    const fixture = cloneDefinitions();
    fixture[0].approvedSha256 = '0'.repeat(64);
    assert.throws(() => validateCrawlManifest(fixture), /unexpected/);
  });
  await context.test('extra property', () => {
    const fixture = cloneDefinitions();
    fixture[0].extra = true;
    assert.throws(() => validateCrawlManifest(fixture), /property-allowlist/);
  });
  await context.test('extension mismatch', () => {
    const fixture = cloneDefinitions();
    fixture[0].extension = '.html';
    assert.throws(() => validateCrawlManifest(fixture), /unexpected|extension/);
  });
});

test('crawl paths reject traversal, backslashes, URLs, absolute and private candidates', () => {
  for (const candidate of [
    '../robots.txt',
    'folder/../robots.txt',
    'folder\\robots.txt',
    'https://example.invalid/robots.txt',
    'C:/robots.txt',
    '/robots.txt',
    'robots.txt?token=x',
    'private.txt',
    'recovery/robots.txt',
    '.env',
    'unexpected.txt',
  ]) {
    assert.throws(() => assertSafeCrawlPath(candidate, approvedCrawlSourcePaths), /unsafe-crawl-path/);
  }
});

test('exact robots, sitemap and 404 production validators accept approved sources', async () => {
  const robots = await readFile('public/robots.txt', 'utf8');
  const sitemap = await readFile('public/sitemap.xml', 'utf8');
  const notFound = await readFile('public/404.html', 'utf8');
  assert.equal(robots, EXACT_ROBOTS_TEXT);
  assert.equal(sitemap, EXACT_SITEMAP_TEXT);
  assert.equal(verifyRobotsText(robots), true);
  assert.equal(verifySitemapText(sitemap), true);
  assert.equal(verifyNotFoundHtml(notFound), true);
  assert.deepEqual(
    (await verifyCrawlSourceFiles()).files.map(({ sha256 }) => sha256),
    crawlFiles.map(({ approvedSha256 }) => approvedSha256),
  );
});

test('robots and sitemap reject every obsolete or expanded contract', async (context) => {
  const robotsCases = [
    EXACT_ROBOTS_TEXT.replace('Allow: /', 'Disallow: /'),
    EXACT_ROBOTS_TEXT.replace('ahmedazizbenaissa.me', 'zaizou1003.github.io'),
    `${EXACT_ROBOTS_TEXT}Crawl-delay: 10\n`,
    EXACT_ROBOTS_TEXT.trimEnd(),
  ];
  for (const [index, fixture] of robotsCases.entries()) {
    await context.test(`robots-${index + 1}`, () =>
      assert.throws(() => verifyRobotsText(fixture), /robots-exact-content/),
    );
  }
  const sitemapCases = [
    EXACT_SITEMAP_TEXT.replace('</urlset>', '<url><loc>https://ahmedazizbenaissa.me/404.html</loc></url></urlset>'),
    EXACT_SITEMAP_TEXT.replace('/projects/', '/#/projects/'),
    EXACT_SITEMAP_TEXT.replace('</url>', '<lastmod>2026-01-01</lastmod></url>'),
    EXACT_SITEMAP_TEXT.replace('ahmedazizbenaissa.me', 'zaizou1003.github.io'),
    EXACT_SITEMAP_TEXT.replace('<urlset', '<urlset xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'),
  ];
  for (const [index, fixture] of sitemapCases.entries()) {
    await context.test(`sitemap-${index + 1}`, () =>
      assert.throws(() => verifySitemapText(fixture), /sitemap-exact-content/),
    );
  }
});

test('404 validator rejects redirects, scripts, refresh, external resources and metadata', async (context) => {
  const html = await readFile('public/404.html', 'utf8');
  const cases = [
    html.replace('</body>', '<script>location.replace("/")</script></body>'),
    html.replace('</head>', '<meta http-equiv="refresh" content="0;url=/" /></head>'),
    html.replace('</body>', '<img src="https://example.invalid/x.png" alt=""></body>'),
    html.replace('</body>', '<form></form></body>'),
    html.replace('</head>', '<link rel="canonical" href="https://ahmedazizbenaissa.me/" /></head>'),
    html.replace('</head>', '<script type="application/ld+json">{}</script></head>'),
    html.replace('href="/projects/"', 'href="/#/projects"'),
    html.replace('content="noindex"', 'content="index"'),
  ];
  for (const [index, fixture] of cases.entries()) {
    await context.test(`not-found-${index + 1}`, () =>
      assert.throws(() => verifyNotFoundHtml(fixture), /not-found/),
    );
  }
});

test('crawl buffer validation enforces UTF-8, final newline, byte budget, semantics and hash', async (context) => {
  for (const definition of crawlFiles) {
    await context.test(definition.role, async () => {
      const buffer = await readFile(resolve('public', definition.sourcePath));
      const result = verifyCrawlBuffer(buffer, definition);
      assert.equal(result.sha256, definition.approvedSha256);
      assert.throws(() => verifyCrawlBuffer(Buffer.concat([buffer, Buffer.from('x')]), definition));
      assert.throws(() => verifyCrawlBuffer(buffer.subarray(0, buffer.length - 1), definition));
    });
  }
});

test('regular-path verification rejects a symlink through the production path walker', async () => {
  const fakeRoot = resolve('fixture-root');
  const rootStat = { isDirectory: () => true, isSymbolicLink: () => false, isFile: () => false };
  const symlinkStat = { isDirectory: () => false, isSymbolicLink: () => true, isFile: () => false };
  const fakeLstat = async (path) => (path === fakeRoot ? rootStat : symlinkStat);
  await assert.rejects(
    () => assertRegularCrawlPath(fakeRoot, 'robots.txt', approvedCrawlSourcePaths, fakeLstat),
    /crawl-file-symlink/,
  );
});

test('the production copier copies only three approved bytes and ignores inherited public files', async () => {
  const source = await createSourceFixture();
  const destination = await mkdtemp(resolve(tmpdir(), 'crawl-dist-'));
  try {
    await writeFile(resolve(source, 'banner.png'), 'inherited');
    await writeFile(resolve(source, 'manifest.json'), 'inherited');
    const result = await copyCrawlFiles({ sourceDirectory: source, destinationDirectory: destination });
    assert.deepEqual(result.copied.map(({ destination: path }) => path), approvedCrawlDistPaths);
    assert.equal(await readFile(resolve(source, 'banner.png'), 'utf8'), 'inherited');
    for (const definition of crawlFiles) {
      assert.deepEqual(
        await readFile(resolve(source, definition.sourcePath)),
        await readFile(resolve(destination, definition.distPath)),
      );
    }
    await assert.rejects(() => readFile(resolve(destination, 'banner.png')));
    const verified = await verifyDistCrawlFiles({ directory: destination, sourceDirectory: source });
    assert.equal(verified.files.length, 3);
  } finally {
    await rm(source, { recursive: true, force: true });
    await rm(destination, { recursive: true, force: true });
  }
});

test('copy and source verification reject missing, corrupt and non-regular files', async (context) => {
  await context.test('missing source', async () => {
    const source = await createSourceFixture();
    try {
      await rm(resolve(source, 'robots.txt'));
      await assert.rejects(() => verifyCrawlSourceFiles({ directory: source }), /ENOENT/);
    } finally {
      await rm(source, { recursive: true, force: true });
    }
  });
  await context.test('corrupt source', async () => {
    const source = await createSourceFixture();
    try {
      await writeFile(resolve(source, 'robots.txt'), EXACT_ROBOTS_TEXT.replace('Allow: /', 'Disallow: /'));
      await assert.rejects(() => verifyCrawlSourceFiles({ directory: source }), /robots-exact-content/);
    } finally {
      await rm(source, { recursive: true, force: true });
    }
  });
  await context.test('directory source', async () => {
    const source = await createSourceFixture();
    try {
      await rm(resolve(source, 'robots.txt'));
      await mkdir(resolve(source, 'robots.txt'));
      await assert.rejects(() => verifyCrawlSourceFiles({ directory: source }), /not-regular/);
    } finally {
      await rm(source, { recursive: true, force: true });
    }
  });
});

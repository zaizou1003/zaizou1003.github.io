import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  APPROVED_FOCUS_AREAS,
  APPROVED_HOME_DESCRIPTION,
  APPROVED_PROJECTS_DESCRIPTION,
  buildHomeJsonLd,
  buildProjectsJsonLd,
  escapeJsonForHtml,
  getPageJsonLd,
  getPageMetadata,
  pageMetadata,
  serializeJsonLd,
  validateJsonLdDocument,
  validateMetadataManifest,
} from '../../scripts/metadata/manifest.mjs';
import {
  METADATA_SOURCE_PATHS,
  METADATA_MARKER,
  metadataHtmlPlugin,
  renderMetadataBlock,
  resolveMetadataPageId,
  transformPageHtml,
  verifyPageMetadataHtml,
} from '../../scripts/metadata/html-transform.mjs';

const clone = (value) => structuredClone(value);

async function transformedSource(pageId) {
  const file = pageId === 'home' ? 'index.html' : 'projects/index.html';
  return transformPageHtml(await readFile(file, 'utf8'), pageId);
}

test('the metadata manifest locks the exact approved unique page values', () => {
  assert.equal(validateMetadataManifest(), true);
  assert.deepEqual(Object.keys(pageMetadata), ['home', 'projects']);
  assert.equal(pageMetadata.home.description, APPROVED_HOME_DESCRIPTION);
  assert.equal(pageMetadata.projects.description, APPROVED_PROJECTS_DESCRIPTION);
  assert.notEqual(pageMetadata.home.title, pageMetadata.projects.title);
  assert.notEqual(pageMetadata.home.canonicalUrl, pageMetadata.projects.canonicalUrl);
  assert.notEqual(pageMetadata.home.socialImageUrl, pageMetadata.projects.socialImageUrl);
});

test('source templates contain one metadata marker and no conflicting page metadata', async () => {
  for (const file of ['index.html', 'projects/index.html']) {
    const html = await readFile(file, 'utf8');
    assert.equal(html.split(METADATA_MARKER).length - 1, 1);
    assert.equal(/<title\b|name=["']description|rel=["']canonical|application\/ld\+json/i.test(html), false);
    assert.equal(/name=["']keywords|rel=["']manifest/i.test(html), false);
  }
});

test('production transform emits the exact complete static metadata for both entries', async () => {
  for (const pageId of ['home', 'projects']) {
    const html = await transformedSource(pageId);
    const result = verifyPageMetadataHtml(html, pageId);
    assert.equal(result.title, getPageMetadata(pageId).title);
    assert.equal(result.canonicalUrl, getPageMetadata(pageId).canonicalUrl);
    assert.deepEqual(result.jsonLd, getPageJsonLd(pageId));
    assert.equal(html.includes(METADATA_MARKER), false);
  }
});

test('the Vite plugin routes only the two real HTML entries through the production transform', async () => {
  const plugin = metadataHtmlPlugin();
  const homeSource = await readFile('index.html', 'utf8');
  const projectsSource = await readFile('projects/index.html', 'utf8');
  const home = plugin.transformIndexHtml.handler(homeSource, {
    filename: METADATA_SOURCE_PATHS.home,
  });
  const projectsPage = plugin.transformIndexHtml.handler(projectsSource, {
    filename: METADATA_SOURCE_PATHS.projects,
  });
  assert.doesNotThrow(() => verifyPageMetadataHtml(home, 'home'));
  assert.doesNotThrow(() => verifyPageMetadataHtml(projectsPage, 'projects'));
  assert.equal(resolveMetadataPageId('/index.html'), 'home');
  assert.equal(resolveMetadataPageId('/projects/index.html'), 'projects');
  assert.throws(() => resolveMetadataPageId('/other.html'), /unknown-metadata-entry/);
});

test('metadata entry resolution accepts only the two exact repository templates', async (context) => {
  const approved = [
    ['relative Home', 'index.html', 'home'],
    ['root-form Home', '/index.html', 'home'],
    ['absolute Home', METADATA_SOURCE_PATHS.home, 'home'],
    ['forward-slash absolute Home', METADATA_SOURCE_PATHS.home.replaceAll('\\', '/'), 'home'],
    ['relative Projects', 'projects/index.html', 'projects'],
    ['root-form Projects', '/projects/index.html', 'projects'],
    ['absolute Projects', METADATA_SOURCE_PATHS.projects, 'projects'],
    ['forward-slash absolute Projects', METADATA_SOURCE_PATHS.projects.replaceAll('\\', '/'), 'projects'],
  ];
  for (const [label, pathname, pageId] of approved) {
    await context.test(label, () => assert.equal(resolveMetadataPageId(pathname), pageId));
  }

  const rejected = [
    'nested/index.html',
    'nested/projects/index.html',
    resolve('nested/index.html'),
    resolve('nested/projects/index.html'),
    '/tmp/nested/index.html',
    '/tmp/nested/projects/index.html',
    'C:\\nested\\index.html',
    'C:\\nested\\projects\\index.html',
    'Projects/index.html',
    '/Projects/index.html',
    'projects\\index.html',
    '\\projects\\index.html',
    '/projects\\index.html',
    '\\index.html',
    'projects\\nested/index.html',
    'projects/nested\\index.html',
    '/projects\\nested/index.html',
    '\\projects/index.html',
    'nested/../index.html',
    'projects/../index.html',
    'projects\\..\\index.html',
    'suffix-index.html',
    'prefix/projects/index.html.suffix',
    'index.html?entry=projects',
    'projects/index.html#metadata',
  ];
  for (const pathname of rejected) {
    await context.test(pathname, () =>
      assert.throws(() => resolveMetadataPageId(pathname), /unknown-metadata-entry/),
    );
  }
});

test('metadata marker and conflict enforcement fail closed', async (context) => {
  const source = await readFile('index.html', 'utf8');
  await context.test('missing marker', () =>
    assert.throws(() => transformPageHtml(source.replace(METADATA_MARKER, ''), 'home'), /marker-count/),
  );
  await context.test('duplicate marker', () =>
    assert.throws(() => transformPageHtml(source.replace(METADATA_MARKER, `${METADATA_MARKER}${METADATA_MARKER}`), 'home'), /marker-count/),
  );
  await context.test('conflicting title', () =>
    assert.throws(() => transformPageHtml(source.replace(METADATA_MARKER, `<title>Other</title>${METADATA_MARKER}`), 'home'), /conflicting-metadata/),
  );
  await context.test('unknown page', () =>
    assert.throws(() => transformPageHtml(source, 'unknown'), /unknown-metadata-page/),
  );
});

test('metadata validation rejects drift, extra properties and unsafe canonical values', async (context) => {
  await context.test('description drift', () => {
    const fixture = clone(pageMetadata);
    fixture.home.description = 'Different';
    assert.throws(() => validateMetadataManifest(fixture), /approved-description/);
  });
  await context.test('extra page property', () => {
    const fixture = clone(pageMetadata);
    fixture.home.keywords = 'unsafe';
    assert.throws(() => validateMetadataManifest(fixture), /property-allowlist/);
  });
  for (const value of [
    'http://ahmedazizbenaissa.me/',
    'https://zaizou1003.github.io/',
    'https://ahmedazizbenaissa.me:443/',
    'https://user@ahmedazizbenaissa.me/',
    'https://ahmedazizbenaissa.me/?source=test',
    'https://ahmedazizbenaissa.me/#home',
  ]) {
    await context.test(value, () => {
      const fixture = clone(pageMetadata);
      fixture.home.canonicalUrl = value;
      assert.throws(() => validateMetadataManifest(fixture), /approved-canonicalUrl|approved-url/);
    });
  }
});

test('Home JSON-LD uses only the exact Person and WebSite public allowlists', () => {
  const document = buildHomeJsonLd();
  assert.equal(validateJsonLdDocument(document, 'home'), true);
  assert.deepEqual(document['@graph'].map((item) => item['@type']), ['Person', 'WebSite']);
  assert.deepEqual(document['@graph'][0].sameAs, [
    'https://www.linkedin.com/in/ahmed-ben-aissa-5b34992a3/',
    'https://github.com/zaizou1003',
  ]);
  assert.deepEqual(document['@graph'][0].knowsAbout, APPROVED_FOCUS_AREAS);
  assert.equal(JSON.stringify(document).includes('email'), false);
});

test('Projects JSON-LD derives exactly three ordered canonical anchor references', () => {
  const document = buildProjectsJsonLd();
  assert.equal(validateJsonLdDocument(document, 'projects'), true);
  assert.equal(document.mainEntity.numberOfItems, 3);
  assert.deepEqual(
    document.mainEntity.itemListElement.map(({ position, name, url }) => ({ position, name, url })),
    [
      {
        position: 1,
        name: 'European Air-Quality Evidence Agent',
        url: 'https://ahmedazizbenaissa.me/projects/#european-air-quality-evidence-agent',
      },
      {
        position: 2,
        name: 'FinRL–DeepSeek Research Extension',
        url: 'https://ahmedazizbenaissa.me/projects/#finrl-deepseek-research-extension',
      },
      {
        position: 3,
        name: 'MetaMind Responsible AI Learning Companion',
        url: 'https://ahmedazizbenaissa.me/projects/#metamind-responsible-ai-learning-companion',
      },
    ],
  );
  const keys = [];
  const collectKeys = (value) => {
    if (Array.isArray(value)) value.forEach(collectKeys);
    else if (value && typeof value === 'object') {
      for (const [key, entry] of Object.entries(value)) {
        keys.push(key);
        collectKeys(entry);
      }
    }
  };
  collectKeys(document);
  assert.equal(keys.some((key) => /repository|evidence|publicationStatus/i.test(key)), false);
});

test('JSON-LD recursive type and property allowlists reject private or broad state', async (context) => {
  for (const [label, mutate, pageId] of [
    ['telephone', (value) => { value['@graph'][0].telephone = 'fixture'; }, 'home'],
    ['email', (value) => { value['@graph'][0].email = 'fixture'; }, 'home'],
    ['employer', (value) => { value['@graph'][0].worksFor = {}; }, 'home'],
    ['unknown type', (value) => { value['@graph'][0]['@type'] = 'Unknown'; }, 'home'],
    ['repository', (value) => { value.mainEntity.itemListElement[0].repositoryUrl = 'fixture'; }, 'projects'],
    ['unknown list type', (value) => { value.mainEntity['@type'] = 'Thing'; }, 'projects'],
  ]) {
    await context.test(label, () => {
      const fixture = pageId === 'home' ? buildHomeJsonLd() : buildProjectsJsonLd();
      mutate(fixture);
      assert.throws(() => validateJsonLdDocument(fixture, pageId), /allowlist|approved-type/);
    });
  }
});

test('JSON-LD materialization rejects accessors without evaluating them', async (context) => {
  const cases = [
    ['changing @type accessor', 'home', (value, getter) => {
      Object.defineProperty(value['@graph'][0], '@type', { enumerable: true, get: getter });
    }],
    ['approved-value accessor', 'home', (value, getter) => {
      Object.defineProperty(value['@graph'][0], 'description', { enumerable: true, get: getter });
    }],
    ['nested ListItem accessor', 'projects', (value, getter) => {
      Object.defineProperty(value.mainEntity.itemListElement[0], 'name', {
        enumerable: true,
        get: getter,
      });
    }],
  ];
  for (const [label, pageId, installAccessor] of cases) {
    await context.test(label, () => {
      const fixture = pageId === 'home' ? buildHomeJsonLd() : buildProjectsJsonLd();
      let reads = 0;
      installAccessor(fixture, () => {
        reads += 1;
        return reads === 1 ? 'approved-looking-value' : 'changed-value';
      });
      assert.throws(() => serializeJsonLd(fixture, pageId), /accessor-property/);
      assert.equal(reads, 0);
    });
  }
});

test('JSON-LD materialization rejects sparse arrays at every approved nesting level', async (context) => {
  const cases = [
    ['sparse Home graph', 'home', (value) => { delete value['@graph'][0]; }],
    ['sparse Projects itemListElement', 'projects', (value) => {
      delete value.mainEntity.itemListElement[1];
    }],
    ['sparse nested sameAs', 'home', (value) => { delete value['@graph'][0].sameAs[0]; }],
  ];
  for (const [label, pageId, mutate] of cases) {
    await context.test(label, () => {
      const fixture = pageId === 'home' ? buildHomeJsonLd() : buildProjectsJsonLd();
      mutate(fixture);
      assert.throws(() => serializeJsonLd(fixture, pageId), /sparse-array/);
    });
  }
});

test('JSON-LD materialization rejects symbol properties and unsupported prototypes', async (context) => {
  await context.test('symbol property', () => {
    const fixture = buildHomeJsonLd();
    fixture['@graph'][0][Symbol('hidden')] = 'hidden';
    assert.throws(() => serializeJsonLd(fixture, 'home'), /symbol-property/);
  });
  await context.test('unsupported prototype', () => {
    const fixture = buildProjectsJsonLd();
    Object.setPrototypeOf(fixture.mainEntity, null);
    assert.throws(() => serializeJsonLd(fixture, 'projects'), /unsupported-prototype/);
  });
});

test('serialized JSON-LD is the exact page-validated canonical snapshot', () => {
  for (const pageId of ['home', 'projects']) {
    const expected = getPageJsonLd(pageId);
    const serialized = serializeJsonLd(expected, pageId);
    const emitted = JSON.parse(serialized);
    assert.deepEqual(emitted, expected);
    assert.equal(validateJsonLdDocument(emitted, pageId), true);
    assert.equal(serializeJsonLd(emitted, pageId), serialized);
  }
});

test('safe JSON serialization escapes markup, separators and every closing-script case', () => {
  const fixture = {
    text: '</script><ScRiPt>&\u2028\u2029',
  };
  const serialized = escapeJsonForHtml(fixture);
  assert.equal(/[<>&\u2028\u2029]/u.test(serialized), false);
  assert.equal(/<\/script/i.test(serialized), false);
  assert.deepEqual(JSON.parse(serialized), fixture);
  for (const pageId of ['home', 'projects']) {
    const strict = serializeJsonLd(getPageJsonLd(pageId), pageId);
    assert.equal(/[<>&\u2028\u2029]/u.test(strict), false);
    assert.equal(/<\/script/i.test(strict), false);
  }
});

test('safe JSON serialization rejects cycles, non-finite numbers and unsupported objects', async (context) => {
  await context.test('cycle', () => {
    const fixture = {};
    fixture.self = fixture;
    assert.throws(() => escapeJsonForHtml(fixture), /cyclic-value/);
  });
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    await context.test(String(value), () =>
      assert.throws(() => escapeJsonForHtml({ value }), /non-finite-number/),
    );
  }
  await context.test('Date', () =>
    assert.throws(() => escapeJsonForHtml({ value: new Date() }), /unsupported-prototype/),
  );
  await context.test('function', () =>
    assert.throws(() => escapeJsonForHtml({ value: () => {} }), /unsupported-value/),
  );
});

test('generated metadata verification rejects duplicates, conflicts and runtime metadata', async (context) => {
  const html = await transformedSource('home');
  const cases = [
    ['duplicate title', html.replace('</title>', '</title><title>Other</title>'), /home-title/],
    ['duplicate canonical', html.replace('</head>', '<link rel="canonical" href="https://ahmedazizbenaissa.me/" /></head>'), /canonical/],
    ['keywords', html.replace('</head>', '<meta name="keywords" content="x" /></head>'), /forbidden-metadata/],
    ['PWA manifest', html.replace('</head>', '<link rel="manifest" href="/manifest.json" /></head>'), /runtime-or-pwa/],
    ['runtime marker', html.replace('</head>', '<meta name="react-helmet" content="true" /></head>'), /runtime-or-pwa/],
    ['wrong social dimension', html.replace('property="og:image:width" content="1200"', 'property="og:image:width" content="600"'), /og:image:width/],
    ['wrong icon', html.replace('href="/favicon.svg"', 'href="https://example.invalid/favicon.svg"'), /favicon/],
  ];
  for (const [label, fixture, expression] of cases) {
    await context.test(label, () =>
      assert.throws(() => verifyPageMetadataHtml(fixture, 'home'), expression),
    );
  }
});

test('metadata blocks contain no unsupported tags or runtime dependency', () => {
  for (const pageId of ['home', 'projects']) {
    const block = renderMetadataBlock(pageId);
    assert.equal(/keywords|rel="manifest"|twitter:(?:site|creator)|react-helmet/i.test(block), false);
    assert.equal((block.match(/application\/ld\+json/g) ?? []).length, 1);
  }
});

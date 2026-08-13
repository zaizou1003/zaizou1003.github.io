import { profile } from '../../src/data/profile.js';
import { projects } from '../../src/data/projects.js';
import { selectPublishedProjects } from '../../src/data/selectors.js';

export const CANONICAL_ORIGIN = 'https://ahmedazizbenaissa.me';
export const METADATA_PAGE_IDS = Object.freeze(['home', 'projects']);

export const APPROVED_HOME_DESCRIPTION =
  'Ahmed Aziz Ben Aissa is an AI Systems Engineer focused on agentic AI, Model Context Protocol, retrieval, responsible AI, applied research and production reliability.';
export const APPROVED_PROJECTS_DESCRIPTION =
  'Evidence-led AI systems case studies covering architecture, research methods, evaluation and reliability.';

export const APPROVED_FOCUS_AREAS = Object.freeze([
  'Agentic AI',
  'MCP systems',
  'Retrieval-augmented generation',
  'Applied AI research',
  'Responsible AI',
  'Production AI engineering',
  'Evaluation, safety and reliability',
]);

const APPROVED_SAME_AS = Object.freeze([
  'https://www.linkedin.com/in/ahmed-ben-aissa-5b34992a3/',
  'https://github.com/zaizou1003',
]);

const APPROVED_PROJECT_ITEMS = Object.freeze([
  Object.freeze({
    id: 'european-air-quality-evidence-agent',
    title: 'European Air-Quality Evidence Agent',
    position: 1,
  }),
  Object.freeze({
    id: 'finrl-deepseek-research-extension',
    title: 'FinRL–DeepSeek Research Extension',
    position: 2,
  }),
  Object.freeze({
    id: 'metamind-responsible-ai-learning-companion',
    title: 'MetaMind Responsible AI Learning Companion',
    position: 3,
  }),
]);

const definePage = (definition) => Object.freeze(definition);

export const pageMetadata = Object.freeze({
  home: definePage({
    id: 'home',
    sourcePath: '/index.html',
    title: 'Ahmed Aziz Ben Aissa — AI Systems Engineer',
    description: APPROVED_HOME_DESCRIPTION,
    canonicalUrl: `${CANONICAL_ORIGIN}/`,
    socialImageUrl: `${CANONICAL_ORIGIN}/social/home-og.jpg`,
    socialImageAlt:
      'Ahmed Aziz Ben Aissa — AI Systems Engineer, focused on agentic AI, MCP, retrieval, evaluation and reliability.',
  }),
  projects: definePage({
    id: 'projects',
    sourcePath: '/projects/index.html',
    title: 'AI Systems Projects — Ahmed Aziz Ben Aissa',
    description: APPROVED_PROJECTS_DESCRIPTION,
    canonicalUrl: `${CANONICAL_ORIGIN}/projects/`,
    socialImageUrl: `${CANONICAL_ORIGIN}/social/projects-og.jpg`,
    socialImageAlt:
      'AI Systems Projects by Ahmed Aziz Ben Aissa, presented as evidence-led case studies.',
  }),
});

const PAGE_KEYS = Object.freeze([
  'id',
  'sourcePath',
  'title',
  'description',
  'canonicalUrl',
  'socialImageUrl',
  'socialImageAlt',
]);

const TYPE_KEYS = Object.freeze({
  Person: Object.freeze([
    '@type',
    'name',
    'url',
    'jobTitle',
    'description',
    'sameAs',
    'knowsAbout',
  ]),
  WebSite: Object.freeze(['@type', 'name', 'url']),
  CollectionPage: Object.freeze([
    '@context',
    '@type',
    'name',
    'description',
    'url',
    'mainEntity',
  ]),
  ItemList: Object.freeze(['@type', 'numberOfItems', 'itemListElement']),
  ListItem: Object.freeze(['@type', 'position', 'name', 'url']),
});

function assertPlainObject(value, label) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new Error(`${label}-must-be-a-plain-object`);
  }
}

function assertExactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  if (
    actual.length !== sortedExpected.length ||
    actual.some((key, index) => key !== sortedExpected[index])
  ) {
    throw new Error(`${label}-property-allowlist`);
  }
}

function assertExactArray(actual, expected, label) {
  if (!Array.isArray(actual) || actual.length !== expected.length) {
    throw new Error(`${label}-exact-order`);
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (!Object.hasOwn(actual, index) || actual[index] !== expected[index]) {
      throw new Error(`${label}-exact-order`);
    }
  }
}

function assertExactHttpsUrl(value, expected, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label}-absolute-url`);
  }
  if (
    value !== expected ||
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(`${label}-approved-url`);
  }
}

function materializeJsonValue(value, seen = new WeakSet(), label = 'json-ld') {
  if (value === null || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    throw new Error(`${label}-unsupported-value`);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${label}-non-finite-number`);
    return value;
  }
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value !== 'object') throw new Error(`${label}-unsupported-value`);
  if (seen.has(value)) throw new Error(`${label}-cyclic-value`);
  seen.add(value);

  const isArray = Array.isArray(value);
  const expectedPrototype = isArray ? Array.prototype : Object.prototype;
  if (Object.getPrototypeOf(value) !== expectedPrototype) {
    throw new Error(`${label}-unsupported-prototype`);
  }

  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key === 'symbol')) {
    throw new Error(`${label}-symbol-property`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const readDataProperty = (key, propertyLabel) => {
    const descriptor = descriptors[key];
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || descriptor.get || descriptor.set) {
      throw new Error(`${propertyLabel}-accessor-property`);
    }
    if (!descriptor.enumerable) throw new Error(`${propertyLabel}-non-enumerable-property`);
    return descriptor.value;
  };

  let snapshot;
  if (isArray) {
    const expectedKeys = new Set(['length']);
    snapshot = [];
    for (let index = 0; index < value.length; index += 1) {
      const key = String(index);
      expectedKeys.add(key);
      if (!Object.hasOwn(descriptors, key)) throw new Error(`${label}-${index}-sparse-array`);
      const entry = readDataProperty(key, `${label}-${index}`);
      snapshot.push(materializeJsonValue(entry, seen, `${label}-${index}`));
    }
    if (ownKeys.some((key) => !expectedKeys.has(key))) {
      throw new Error(`${label}-array-property-allowlist`);
    }
  } else {
    snapshot = {};
    for (const key of ownKeys) {
      const entry = readDataProperty(key, `${label}-${key}`);
      Object.defineProperty(snapshot, key, {
        value: materializeJsonValue(entry, seen, `${label}-${key}`),
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
  }
  seen.delete(value);
  return snapshot;
}

function validateTypedNode(node, type, label) {
  assertPlainObject(node, label);
  if (node['@type'] !== type || !TYPE_KEYS[type]) throw new Error(`${label}-approved-type`);
  assertExactKeys(node, TYPE_KEYS[type], label);
}

export function buildHomeJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        name: profile.name,
        url: pageMetadata.home.canonicalUrl,
        jobTitle: profile.role,
        description: pageMetadata.home.description,
        sameAs: [profile.links.linkedin.href, profile.links.github.href],
        knowsAbout: [...profile.focusAreas],
      },
      {
        '@type': 'WebSite',
        name: profile.name,
        url: pageMetadata.home.canonicalUrl,
      },
    ],
  };
}

export function buildProjectsJsonLd(projectRecords = projects) {
  const published = selectPublishedProjects(projectRecords);
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: pageMetadata.projects.title,
    description: pageMetadata.projects.description,
    url: pageMetadata.projects.canonicalUrl,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: published.length,
      itemListElement: published.map((project, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: project.title,
        url: `${pageMetadata.projects.canonicalUrl}#${project.id}`,
      })),
    },
  };
}

function validateHomeJsonLd(document) {
  assertPlainObject(document, 'home-json-ld');
  assertExactKeys(document, ['@context', '@graph'], 'home-json-ld');
  if (document['@context'] !== 'https://schema.org') throw new Error('home-json-ld-context');
  if (!Array.isArray(document['@graph']) || document['@graph'].length !== 2) {
    throw new Error('home-json-ld-graph');
  }
  const [person, website] = document['@graph'];
  validateTypedNode(person, 'Person', 'home-person');
  validateTypedNode(website, 'WebSite', 'home-website');
  if (
    person.name !== 'Ahmed Aziz Ben Aissa' ||
    person.jobTitle !== 'AI Systems Engineer' ||
    person.description !== APPROVED_HOME_DESCRIPTION
  ) {
    throw new Error('home-person-approved-values');
  }
  assertExactHttpsUrl(person.url, `${CANONICAL_ORIGIN}/`, 'home-person-url');
  assertExactArray(person.sameAs, APPROVED_SAME_AS, 'home-person-same-as');
  assertExactArray(person.knowsAbout, APPROVED_FOCUS_AREAS, 'home-person-knows-about');
  if (website.name !== 'Ahmed Aziz Ben Aissa') throw new Error('home-website-name');
  assertExactHttpsUrl(website.url, `${CANONICAL_ORIGIN}/`, 'home-website-url');
}

function validateProjectsJsonLd(document) {
  validateTypedNode(document, 'CollectionPage', 'projects-json-ld');
  if (document['@context'] !== 'https://schema.org') throw new Error('projects-json-ld-context');
  if (
    document.name !== pageMetadata.projects.title ||
    document.description !== APPROVED_PROJECTS_DESCRIPTION
  ) {
    throw new Error('projects-json-ld-approved-values');
  }
  assertExactHttpsUrl(
    document.url,
    `${CANONICAL_ORIGIN}/projects/`,
    'projects-json-ld-url',
  );
  const list = document.mainEntity;
  validateTypedNode(list, 'ItemList', 'projects-item-list');
  if (list.numberOfItems !== APPROVED_PROJECT_ITEMS.length) {
    throw new Error('projects-item-list-count');
  }
  if (!Array.isArray(list.itemListElement) || list.itemListElement.length !== APPROVED_PROJECT_ITEMS.length) {
    throw new Error('projects-list-item-count');
  }
  list.itemListElement.forEach((item, index) => {
    const expected = APPROVED_PROJECT_ITEMS[index];
    validateTypedNode(item, 'ListItem', `projects-list-item-${index + 1}`);
    if (item.position !== expected.position || item.name !== expected.title) {
      throw new Error('projects-list-item-approved-values');
    }
    assertExactHttpsUrl(
      item.url.replace(`#${expected.id}`, ''),
      `${CANONICAL_ORIGIN}/projects/`,
      'projects-list-item-base-url',
    );
    if (item.url !== `${CANONICAL_ORIGIN}/projects/#${expected.id}`) {
      throw new Error('projects-list-item-anchor');
    }
  });
}

function validateJsonLdSnapshot(snapshot, pageId) {
  if (pageId === 'home') validateHomeJsonLd(snapshot);
  else if (pageId === 'projects') validateProjectsJsonLd(snapshot);
  else throw new Error('unknown-json-ld-page');
}

export function validateJsonLdDocument(document, pageId) {
  const snapshot = materializeJsonValue(document);
  validateJsonLdSnapshot(snapshot, pageId);
  return true;
}

function canonicalizeJsonLdDocument(document, pageId) {
  if (pageId === 'home') {
    const [person, website] = document['@graph'];
    return {
      '@context': document['@context'],
      '@graph': [
        {
          '@type': person['@type'],
          name: person.name,
          url: person.url,
          jobTitle: person.jobTitle,
          description: person.description,
          sameAs: [...person.sameAs],
          knowsAbout: [...person.knowsAbout],
        },
        { '@type': website['@type'], name: website.name, url: website.url },
      ],
    };
  }
  return {
    '@context': document['@context'],
    '@type': document['@type'],
    name: document.name,
    description: document.description,
    url: document.url,
    mainEntity: {
      '@type': document.mainEntity['@type'],
      numberOfItems: document.mainEntity.numberOfItems,
      itemListElement: document.mainEntity.itemListElement.map((item) => ({
        '@type': item['@type'],
        position: item.position,
        name: item.name,
        url: item.url,
      })),
    },
  };
}

function escapeJsonSnapshotForHtml(snapshot) {
  return JSON.stringify(snapshot)
    .replaceAll('<', '\\u003C')
    .replaceAll('>', '\\u003E')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

export function escapeJsonForHtml(value) {
  return escapeJsonSnapshotForHtml(materializeJsonValue(value));
}

export function serializeJsonLd(document, pageId) {
  const inputSnapshot = materializeJsonValue(document);
  validateJsonLdSnapshot(inputSnapshot, pageId);
  const serializedSnapshot = canonicalizeJsonLdDocument(inputSnapshot, pageId);
  validateJsonLdSnapshot(serializedSnapshot, pageId);
  const serialized = escapeJsonSnapshotForHtml(serializedSnapshot);
  if (/<\/script/i.test(serialized) || /[<>&\u2028\u2029]/u.test(serialized)) {
    throw new Error('unsafe-json-ld-serialization');
  }
  return serialized;
}

export function getPageJsonLd(pageId) {
  if (pageId === 'home') return buildHomeJsonLd();
  if (pageId === 'projects') return buildProjectsJsonLd();
  throw new Error('unknown-metadata-page');
}

export function getPageMetadata(pageId) {
  const metadata = pageMetadata[pageId];
  if (!metadata) throw new Error('unknown-metadata-page');
  return metadata;
}

export function validateMetadataManifest(records = pageMetadata) {
  assertPlainObject(records, 'metadata-manifest');
  assertExactKeys(records, METADATA_PAGE_IDS, 'metadata-manifest');
  for (const pageId of METADATA_PAGE_IDS) {
    const actual = records[pageId];
    const expected = pageMetadata[pageId];
    assertPlainObject(actual, `${pageId}-metadata`);
    assertExactKeys(actual, PAGE_KEYS, `${pageId}-metadata`);
    for (const key of PAGE_KEYS) {
      if (actual[key] !== expected[key]) throw new Error(`${pageId}-metadata-approved-${key}`);
    }
    assertExactHttpsUrl(actual.canonicalUrl, expected.canonicalUrl, `${pageId}-canonical`);
    assertExactHttpsUrl(actual.socialImageUrl, expected.socialImageUrl, `${pageId}-social-image`);
    serializeJsonLd(getPageJsonLd(pageId), pageId);
  }
  return true;
}

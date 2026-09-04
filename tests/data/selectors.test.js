import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CERTIFICATION_COUNT,
  FLAGSHIP_PROJECTS,
  portfolioData,
  selectCapabilities,
  selectFeaturedCertifications,
  selectFeaturedProjects,
  selectPublishedCertifications,
  selectPublishedEducation,
  selectPublishedExperience,
  selectPublishedProjects,
  selectPublishedSkillGroups,
  selectRemainingCertifications,
  selectSelectedWorkProjects,
  selectSkillGroups,
  validatePortfolioData,
} from '../../src/data/index.js';
import { formatMonthRange, formatMonthYear, formatYearRange } from '../../src/utils/dates.js';
import {
  ALL_PROJECTS_CATEGORY,
  createProjectFilterHref,
  filterPublishedProjects,
  getAvailableProjectCategories,
  getProjectFilterView,
  parseProjectCategory,
  resolveProjectLocation,
} from '../../src/utils/projectFilters.js';
import {
  getProjectArtifactLinks,
  getProjectCategoryLabel,
  getProjectWorkModeLabel,
} from '../../src/utils/projectPresentation.js';

const FEATURED_CERTIFICATION_IDS = [
  'microsoft-azure-ai-apps-agents-developer-associate',
  'anthropic-introduction-to-model-context-protocol',
  'hugging-face-ai-agent-course',
];

const REMAINING_CERTIFICATION_IDS = [
  'microsoft-azure-data-scientist-associate',
  'google-connect-protect-networks-network-security',
  'google-play-it-safe-manage-security-risks',
  'google-coursera-foundations-cybersecurity',
  'hugging-face-ai-agents-fundamentals',
  'nvidia-fundamentals-deep-learning',
  'nvidia-applications-ai-predictive-maintenance',
  'nvidia-building-transformer-based-nlp-applications',
];

const CERTIFICATION_SELECTORS = [
  ['featured', selectFeaturedCertifications],
  ['remaining', selectRemainingCertifications],
  ['published', selectPublishedCertifications],
];

function assertEveryCertificationSelectorRejects(mutate, expectedError) {
  for (const [name, selector] of CERTIFICATION_SELECTORS) {
    const records = structuredClone(portfolioData.certifications);
    mutate(records);
    assert.throws(
      () => selector(records),
      expectedError,
      `${name} selector accepted an invalid certification collection`,
    );
  }
}

test('selectors are deterministic and do not mutate their inputs', () => {
  const projects = structuredClone(portfolioData.projects).reverse();
  const experience = structuredClone(portfolioData.experience).reverse();
  const skills = structuredClone(portfolioData.skills).reverse();
  const certifications = structuredClone(portfolioData.certifications).reverse();
  const education = structuredClone(portfolioData.education).reverse();
  const snapshots = [projects, experience, skills, certifications, education].map((value) =>
    JSON.stringify(value),
  );

  assert.deepEqual(
    selectPublishedProjects(projects).map((record) => record.id),
    FLAGSHIP_PROJECTS.map((record) => record.id),
  );
  assert.deepEqual(
    selectFeaturedProjects(projects).map((record) => record.featuredOrder),
    [1, 2, 3],
  );
  assert.deepEqual(selectSelectedWorkProjects(projects), []);
  assert.deepEqual(
    selectPublishedExperience(experience).map((record) => record.employer),
    ['Ayming', 'VroomVroom'],
  );
  assert.deepEqual(
    selectSkillGroups(skills).map((group) => group.displayOrder),
    [1, 2, 3, 4],
  );
  assert.deepEqual(
    selectFeaturedCertifications(certifications).map((record) => record.id),
    FEATURED_CERTIFICATION_IDS,
  );
  assert.deepEqual(
    selectPublishedEducation(education).map((record) => record.endDate),
    ['2026', '2024'],
  );

  assert.deepEqual(
    [projects, experience, skills, certifications, education].map((value) => JSON.stringify(value)),
    snapshots,
  );
});

test('certification selectors accept canonical, reversed and shuffled approved inputs deterministically', () => {
  assert.equal(CERTIFICATION_COUNT, 11);
  const canonical = structuredClone(portfolioData.certifications);
  const reversed = structuredClone(portfolioData.certifications).reverse();
  const shuffleOrder = [5, 0, 10, 3, 8, 1, 6, 9, 2, 7, 4];
  const shuffled = shuffleOrder.map((index) => structuredClone(portfolioData.certifications[index]));

  for (const records of [canonical, reversed, shuffled]) {
    const snapshot = JSON.stringify(records);
    const featured = selectFeaturedCertifications(records);
    const remaining = selectRemainingCertifications(records);
    const published = selectPublishedCertifications(records);

    assert.notStrictEqual(featured, records);
    assert.notStrictEqual(remaining, records);
    assert.notStrictEqual(published, records);
    assert.deepEqual(featured.map(({ id }) => id), FEATURED_CERTIFICATION_IDS);
    assert.deepEqual(remaining.map(({ id }) => id), REMAINING_CERTIFICATION_IDS);
    assert.deepEqual(
      published.map(({ id }) => id),
      [...FEATURED_CERTIFICATION_IDS, ...REMAINING_CERTIFICATION_IDS],
    );
    assert.equal(new Set(published.map(({ id }) => id)).size, CERTIFICATION_COUNT);
    assert.equal(featured.some(({ id }) => remaining.some((record) => record.id === id)), false);
    assert.deepEqual([...featured, ...remaining], published);
    assert.equal(JSON.stringify(records), snapshot);
  }
});

test('every public certification selector rejects malformed or unapproved collections', async (context) => {
  const cases = [
    ['unknown remainder ID', (records) => { records[10].id = 'unknown-approved-shape'; }, /owner-approved certification/i],
    ['missing approved ID', (records) => { records.pop(); }, /exactly the 11 approved records/i],
    ['duplicate ID', (records) => { records[10].id = records[9].id; }, /duplicate id/i],
    ['case-variant duplicate title', (records) => { records[4].title = records[3].title.toUpperCase(); }, /duplicate title/i],
    ['modified featured title', (records) => { records[0].title = 'Synthetic featured certification title'; }, /owner-approved value/i],
    ['modified remainder title', (records) => { records[4].title = 'Modified certification title'; }, /owner-approved value/i],
    ['modified remainder issuer', (records) => { records[4].issuer = 'Modified issuer'; }, /owner-approved value/i],
    ['modified issue date', (records) => { records[4].issuedDate = '2025-04'; }, /owner-approved value/i],
    ['invalid issue month', (records) => { records[4].issuedDate = '2025-13'; }, /valid YYYY-MM/i],
    ['invalid featured expiry month', (records) => { records[0].expiresDate = '2027-13'; }, /valid YYYY-MM/i],
    ['invalid remainder expiry month', (records) => {
      records[4].expiresDate = '2025-13';
      records[4].credentialStatus = 'active';
    }, /valid YYYY-MM/i],
    ['expiry preceding issue', (records) => { records[0].expiresDate = '2026-06'; }, /precedes its issue date/i],
    ['expiry with null status', (records) => { records[0].credentialStatus = null; }, /active or expired/i],
    ['status without expiry', (records) => { records[4].credentialStatus = 'active'; }, /must be null/i],
    ['wrong active status', (records) => { records[0].credentialStatus = 'expired'; }, /owner-approved value/i],
    ['wrong expired status', (records) => { records[3].credentialStatus = 'active'; }, /owner-approved value/i],
    ['modified credential URL', (records) => { records[4].credentialUrl = 'https://example.com/certification'; }, /owner-approved value/i],
    ['query-bearing URL', (records) => { records[4].credentialUrl = 'https://example.com/certification?view=public'; }, /parameters|signed or expiring URL/i],
    ['signed URL', (records) => { records[4].credentialUrl = 'https://example.com/certification?signature=redacted'; }, /signed or expiring URL|parameters/i],
    ['shortened URL', (records) => { records[4].credentialUrl = 'https://sub.bit.ly./certification'; }, /shortener/i],
    ['non-HTTPS URL', (records) => { records[4].credentialUrl = 'http://example.com/certification'; }, /HTTPS/i],
    ['credential-bearing URL', (records) => { records[4].credentialUrl = 'https://user:password@example.com/certification'; }, /credential-like private content|embedded credentials/i],
    ['featured order zero', (records) => { records[0].featuredOrder = 0; }, /1, 2, 3, or null/i],
    ['featured order four', (records) => { records[0].featuredOrder = 4; }, /1, 2, 3, or null/i],
    ['featured order string', (records) => { records[0].featuredOrder = '1'; }, /1, 2, 3, or null/i],
    ['duplicate featured order', (records) => { records[1].featuredOrder = 1; }, /duplicate featured orders/i],
    ['incomplete featured orders', (records) => { records[1].featuredOrder = null; }, /exactly three featured records|owner-approved/i],
    ['featured order on remainder', (records) => {
      records[2].featuredOrder = null;
      records[3].featuredOrder = 3;
    }, /owner-approved value|featured order/i],
    ['null featured order on featured', (records) => { records[0].featuredOrder = null; }, /exactly three featured records|owner-approved/i],
    ['modified publication status', (records) => { records[4].publicationStatus = 'withheld'; }, /owner-approved value/i],
    ['image field', (records) => { records[4].image = '/images/certificate.png'; }, /publish-safe contract/i],
    ['description field', (records) => { records[4].description = 'Additional description'; }, /publish-safe contract/i],
    ['skills field', (records) => { records[4].skills = ['AI']; }, /publish-safe contract/i],
    ['credential ID', (records) => { records[4].credentialId = 'synthetic-id'; }, /forbidden private or service-identifier field/i],
    ['badge ID', (records) => { records[4].badgeId = 'synthetic-id'; }, /publish-safe contract|forbidden private or service-identifier field/i],
    ['verification code', (records) => { records[4].verificationCode = 'synthetic-code'; }, /publish-safe contract|forbidden private or service-identifier field/i],
    ['QR field', (records) => { records[4].qrCode = 'synthetic-code'; }, /publish-safe contract|forbidden private or service-identifier field/i],
    ['generic metadata field', (records) => { records[4].metadata = { public: true }; }, /publish-safe contract|forbidden private or service-identifier field/i],
    ['arbitrary additional field', (records) => { records[4].notes = 'Additional note'; }, /publish-safe contract/i],
    ['private content on unpublished record', (records) => {
      records[4].publicationStatus = 'withheld';
      records[4].title = 'api_key=redacted-test-value';
    }, /credential-like private content/i],
    ['malformed reversed collection', (records) => {
      records[4].issuer = 'Modified issuer';
      records.reverse();
    }, /owner-approved value/i],
    ['malformed shuffled collection', (records) => {
      records[4].issuedDate = 'not-a-month';
      const reordered = [5, 0, 10, 3, 8, 1, 6, 9, 2, 7, 4].map((index) => records[index]);
      records.splice(0, records.length, ...reordered);
    }, /valid YYYY-MM/i],
  ];

  for (const [name, mutate, expectedError] of cases) {
    await context.test(name, () => {
      assertEveryCertificationSelectorRejects(mutate, expectedError);
    });
  }
});

test('homepage capability and evidence-backed skill selectors are exact and deterministic', () => {
  assert.deepEqual(
    selectCapabilities(structuredClone(portfolioData.capabilities).reverse()).map(
      (capability) => capability.displayOrder,
    ),
    [1, 2, 3, 4],
  );
  assert.deepEqual(
    selectPublishedSkillGroups(
      structuredClone(portfolioData.skills).reverse(),
      portfolioData.projects,
      portfolioData.experience,
    ).map((group) => group.id),
    portfolioData.skills.map((group) => group.id),
  );
});

test('homepage date formatting is deterministic and locale-independent', () => {
  assert.equal(formatMonthYear('2026-07'), 'July 2026');
  assert.equal(formatMonthRange('2025-10', null), 'October 2025–present');
  assert.equal(formatMonthRange('2025-06', '2025-08'), 'June 2025–August 2025');
  assert.equal(formatYearRange('2024', '2026'), '2024–2026');
});

test('broken project evidence references fail validation', () => {
  const data = structuredClone(portfolioData);
  data.skills[0].skills[0].evidenceProjectIds = ['missing-project'];
  assert.throws(() => validatePortfolioData(data), /broken project reference missing-project/i);
});

test('broken experience evidence references fail validation', () => {
  const data = structuredClone(portfolioData);
  data.skills[0].skills[0].evidenceExperienceIds = ['missing-experience'];
  assert.throws(() => validatePortfolioData(data), /broken experience reference missing-experience/i);
});

test('skills require at least one approved evidence reference', () => {
  const data = structuredClone(portfolioData);
  data.skills[0].skills[0].evidenceProjectIds = [];
  data.skills[0].skills[0].evidenceExperienceIds = [];
  assert.throws(() => validatePortfolioData(data), /requires approved project or experience evidence/i);
});

test('project filters expose only useful categories from published projects', () => {
  const reversedProjects = structuredClone(portfolioData.projects).reverse();
  const snapshot = JSON.stringify(reversedProjects);
  const available = getAvailableProjectCategories(reversedProjects);

  assert.deepEqual(available, [
    'agentic-ai',
    'mcp',
    'rag',
    'applied-research',
    'responsible-ai',
    'production-ai',
    'data-systems',
  ]);
  assert.equal(available.includes('computer-vision'), false);
  assert.deepEqual(
    filterPublishedProjects(reversedProjects, 'agentic-ai').map((project) => project.id),
    [
      'european-air-quality-evidence-agent',
      'metamind-responsible-ai-learning-companion',
    ],
  );
  assert.deepEqual(
    filterPublishedProjects(reversedProjects, ALL_PROJECTS_CATEGORY).map((project) => project.id),
    FLAGSHIP_PROJECTS.map((project) => project.id),
  );
  assert.equal(JSON.stringify(reversedProjects), snapshot);

  const identicalToAllFixture = structuredClone(portfolioData.projects).map((project) => ({
    ...project,
    categories: [...project.categories, 'computer-vision'],
  }));
  assert.equal(
    getAvailableProjectCategories(identicalToAllFixture).includes('computer-vision'),
    false,
  );

  const unpublishedOnlyFixture = [
    ...structuredClone(portfolioData.projects),
    {
      ...structuredClone(portfolioData.projects[0]),
      id: 'test-local-unpublished-project',
      categories: ['computer-vision'],
      featuredOrder: null,
      publicationStatus: 'withheld',
    },
  ];
  assert.equal(
    getAvailableProjectCategories(unpublishedOnlyFixture).includes('computer-vision'),
    false,
  );
  assert.equal(
    filterPublishedProjects(unpublishedOnlyFixture, ALL_PROJECTS_CATEGORY).some(
      (project) => project.id === 'test-local-unpublished-project',
    ),
    false,
  );
});

test('project category query parsing accepts only one currently available category', () => {
  const available = getAvailableProjectCategories(portfolioData.projects);

  assert.deepEqual(parseProjectCategory('', available), {
    category: ALL_PROJECTS_CATEGORY,
    shouldNormalize: false,
  });
  assert.deepEqual(parseProjectCategory('?category=agentic-ai', available), {
    category: 'agentic-ai',
    shouldNormalize: false,
  });
  for (const search of [
    '?category=computer-vision',
    '?category=unknown',
    '?category=',
    '?category=agentic-ai&category=mcp',
    '?category=%E0%A4%A',
    '?category=agentic-ai&source=test',
  ]) {
    assert.deepEqual(parseProjectCategory(search, available), {
      category: ALL_PROJECTS_CATEGORY,
      shouldNormalize: true,
    });
  }
});

test('known project fragments take precedence over conflicting category filters', () => {
  const available = getAvailableProjectCategories(portfolioData.projects);
  const airQualityId = 'european-air-quality-evidence-agent';

  assert.deepEqual(
    resolveProjectLocation(
      '?category=applied-research',
      `#${airQualityId}`,
      portfolioData.projects,
      available,
    ),
    {
      category: ALL_PROJECTS_CATEGORY,
      shouldNormalize: true,
      href: `/projects/#${airQualityId}`,
      projectId: airQualityId,
    },
  );
  assert.deepEqual(
    resolveProjectLocation(
      '?category=agentic-ai',
      `#${airQualityId}`,
      portfolioData.projects,
      available,
    ),
    {
      category: 'agentic-ai',
      shouldNormalize: false,
      href: `/projects/?category=agentic-ai#${airQualityId}`,
      projectId: airQualityId,
    },
  );
  assert.equal(
    createProjectFilterHref('responsible-ai', available),
    '/projects/?category=responsible-ai',
  );
  assert.equal(createProjectFilterHref(ALL_PROJECTS_CATEGORY, available), '/projects/');
  assert.equal(createProjectFilterHref('arbitrary-input', available), '/projects/');
});

test('defensive project-filter empty state and Clear behavior remain fixture-safe', () => {
  const fixtureView = getProjectFilterView(portfolioData.projects, 'computer-vision');
  assert.equal(fixtureView.resultCount, 0);
  assert.equal(fixtureView.totalCount, 3);
  assert.equal(fixtureView.isEmpty, true);
  assert.equal(fixtureView.showClear, true);
  assert.equal(fixtureView.announcement, 'Showing 0 of 3 projects.');

  const clearedView = getProjectFilterView(portfolioData.projects, ALL_PROJECTS_CATEGORY);
  assert.equal(clearedView.resultCount, 3);
  assert.equal(clearedView.isEmpty, false);
  assert.equal(clearedView.showClear, false);
});

test('project presentation helpers preserve labels and omit null artifacts', () => {
  assert.equal(getProjectCategoryLabel('mcp'), 'MCP');
  assert.equal(getProjectWorkModeLabel('individual'), 'Individual work by Ahmed');
  assert.deepEqual(getProjectArtifactLinks(portfolioData.projects[2]), []);
  assert.deepEqual(getProjectArtifactLinks(portfolioData.projects[0]), [
    {
      href: portfolioData.projects[0].repositoryUrl,
      label: 'View public repository',
    },
  ]);
  assert.throws(() => getProjectCategoryLabel('unknown'), /unsupported project category/i);
});

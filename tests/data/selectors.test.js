import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FLAGSHIP_PROJECTS,
  portfolioData,
  selectCapabilities,
  selectFeaturedCertifications,
  selectFeaturedProjects,
  selectPublishedEducation,
  selectPublishedExperience,
  selectPublishedProjects,
  selectPublishedSkillGroups,
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
    selectFeaturedCertifications(certifications).map((record) => record.featuredOrder),
    [1, 2, 3],
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

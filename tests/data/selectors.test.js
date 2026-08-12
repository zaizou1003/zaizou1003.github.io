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

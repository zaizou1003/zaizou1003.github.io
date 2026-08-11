import test from 'node:test';
import assert from 'node:assert/strict';

import {
  portfolioData,
  selectFeaturedCertifications,
  selectPublishedEducation,
  selectPublishedExperience,
  selectPublishedProjects,
  selectSkillGroups,
  validatePortfolioData,
} from '../../src/data/index.js';

test('selectors are deterministic and do not mutate their inputs', () => {
  const projects = structuredClone(portfolioData.projects).reverse();
  const experience = structuredClone(portfolioData.experience).reverse();
  const skills = structuredClone(portfolioData.skills).reverse();
  const certifications = structuredClone(portfolioData.certifications).reverse();
  const education = structuredClone(portfolioData.education).reverse();
  const snapshots = [projects, experience, skills, certifications, education].map((value) =>
    JSON.stringify(value),
  );

  assert.deepEqual(selectPublishedProjects(projects), []);
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

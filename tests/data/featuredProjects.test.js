import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FLAGSHIP_PROJECTS,
  portfolioData,
  selectFeaturedCandidates,
  selectFeaturedProjects,
  validatePortfolioData,
} from '../../src/data/index.js';

function publishedFixture() {
  const data = structuredClone(portfolioData);
  data.projects = data.projects.map((project) => ({
    ...project,
    publicationStatus: 'published',
    image: {
      src: `/images/projects/${project.id}.webp`,
      alt: `Approved evidence image for ${project.title}`,
      width: 1200,
      height: 675,
    },
  }));
  return data;
}

test('the real Milestone 2 public featured selector returns no records', () => {
  assert.deepEqual(selectFeaturedProjects(portfolioData.projects), []);
});

test('featured candidates are the exact locked IDs in order 1–3', () => {
  const candidates = selectFeaturedCandidates(portfolioData.projects);
  assert.deepEqual(
    candidates.map(({ id, featuredOrder }) => ({ id, featuredOrder })),
    FLAGSHIP_PROJECTS.map(({ id, featuredOrder }) => ({ id, featuredOrder })),
  );
});

test('safe published fixture copies select exactly three projects in order', () => {
  const data = publishedFixture();
  assert.equal(validatePortfolioData(data), true);
  const selected = selectFeaturedProjects(data.projects);
  assert.deepEqual(
    selected.map((project) => project.id),
    FLAGSHIP_PROJECTS.map((project) => project.id),
  );
});

test('partial publication fails the featured contract', () => {
  const data = publishedFixture();
  data.projects[2].publicationStatus = 'evidence-pending';
  assert.throws(() => selectFeaturedProjects(data.projects), /exactly 3 records/i);
});

test('duplicate featured orders fail validation', () => {
  const data = structuredClone(portfolioData);
  data.projects[1].featuredOrder = 1;
  assert.throws(() => validatePortfolioData(data), /duplicate featured orders/i);
});

test('an unapproved flagship ID or order fails validation', () => {
  const data = structuredClone(portfolioData);
  data.projects[0].featuredOrder = 2;
  data.projects[1].featuredOrder = 1;
  assert.throws(() => validatePortfolioData(data), /Featured order 1/i);
});

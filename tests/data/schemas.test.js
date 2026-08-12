import test from 'node:test';
import assert from 'node:assert/strict';

import { portfolioData, validatePortfolioData } from '../../src/data/index.js';

function cloneData() {
  return structuredClone(portfolioData);
}

test('the approved Milestone 4 dataset satisfies every schema', () => {
  assert.equal(validatePortfolioData(portfolioData), true);
});

test('project IDs must be unique lowercase kebab-case', async (context) => {
  await context.test('duplicate IDs fail', () => {
    const data = cloneData();
    data.projects[1].id = data.projects[0].id;
    assert.throws(() => validatePortfolioData(data), /duplicate id/i);
  });

  await context.test('uppercase or space-separated IDs fail', () => {
    const data = cloneData();
    data.projects[0].id = 'European Air Quality';
    assert.throws(() => validatePortfolioData(data), /lowercase kebab-case/i);
  });
});

test('experience and certification dates are validated', async (context) => {
  await context.test('invalid months fail', () => {
    const data = cloneData();
    data.experience[0].startDate = '2025-13';
    assert.throws(() => validatePortfolioData(data), /valid YYYY-MM/i);
  });

  await context.test('end dates cannot precede start dates', () => {
    const data = cloneData();
    data.experience[1].endDate = '2025-05';
    assert.throws(() => validatePortfolioData(data), /precedes its start date/i);
  });

  await context.test('certificate expiry cannot precede issue', () => {
    const data = cloneData();
    data.certifications[0].expiresDate = '2026-06';
    assert.throws(() => validatePortfolioData(data), /precedes its issue date/i);
  });
});

test('published projects permit text-first cards and retain strict non-null image validation', async (context) => {
  await context.test('a null image is valid for every published flagship', () => {
    const data = cloneData();
    assert.ok(data.projects.every((project) => project.image === null));
    assert.equal(validatePortfolioData(data), true);
  });

  await context.test('a remote non-null image fails', () => {
    const data = cloneData();
    data.projects[0].image = {
      src: 'https://example.com/project.webp',
      alt: 'Approved project evidence image',
      width: 1200,
      height: 675,
    };
    assert.throws(() => validatePortfolioData(data), /approved local image path/i);
  });

  await context.test('missing non-null image metadata fails', () => {
    const data = cloneData();
    data.projects[0].image = {
      src: '/images/projects/air-quality.webp',
      alt: '',
      width: 1200,
      height: 675,
    };
    assert.throws(() => validatePortfolioData(data), /alternative text/i);
  });

  await context.test('missing evidence fails', () => {
    const data = cloneData();
    data.projects[0].evidenceResults = [];
    assert.throws(() => validatePortfolioData(data), /approved evidence/i);
  });

  await context.test('empty evidence method fails', () => {
    const data = cloneData();
    data.projects[0].evidenceResults[0].method = '';
    assert.throws(() => validatePortfolioData(data), /method must be a non-empty string/i);
  });
});

test('missing optional project artifacts remain null, never placeholders', () => {
  const data = cloneData();
  const metaMind = data.projects.find(
    (project) => project.id === 'metamind-responsible-ai-learning-companion',
  );
  assert.equal(metaMind.repositoryUrl, null);
  assert.equal(metaMind.demoPaperUrl, null);
  assert.equal(validatePortfolioData(data), true);
});

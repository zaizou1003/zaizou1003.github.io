import test from 'node:test';
import assert from 'node:assert/strict';

import { portfolioData, validatePortfolioData } from '../../src/data/index.js';

function cloneData() {
  return structuredClone(portfolioData);
}

test('the approved Milestone 7.5 dataset satisfies every schema', () => {
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

test('certifications enforce the exact normalized owner-approved collection', async (context) => {
  await context.test('exact record count', () => {
    const data = cloneData();
    data.certifications.pop();
    assert.throws(() => validatePortfolioData(data), /exactly the 11 approved records/i);
  });

  await context.test('stable lowercase kebab IDs', () => {
    const data = cloneData();
    data.certifications[0].id = 'Microsoft Azure Credential';
    assert.throws(() => validatePortfolioData(data), /lowercase kebab-case/i);
  });

  await context.test('unique IDs', () => {
    const data = cloneData();
    data.certifications[1].id = data.certifications[0].id;
    assert.throws(() => validatePortfolioData(data), /duplicate id/i);
  });

  await context.test('case-insensitive unique titles', () => {
    const data = cloneData();
    data.certifications[1].title = data.certifications[0].title.toUpperCase();
    assert.throws(() => validatePortfolioData(data), /duplicate title/i);
  });

  await context.test('valid issue date is required', () => {
    const data = cloneData();
    data.certifications[4].issuedDate = null;
    assert.throws(() => validatePortfolioData(data), /valid YYYY-MM/i);
  });

  await context.test('only three featured orders are allowed', () => {
    const data = cloneData();
    data.certifications[3].featuredOrder = 4;
    assert.throws(() => validatePortfolioData(data), /1, 2, 3, or null/i);
  });

  for (const featuredOrder of [0, '1']) {
    await context.test(`invalid featured order ${JSON.stringify(featuredOrder)}`, () => {
      const data = cloneData();
      data.certifications[0].featuredOrder = featuredOrder;
      assert.throws(() => validatePortfolioData(data), /1, 2, 3, or null/i);
    });
  }

  await context.test('featured orders are unique', () => {
    const data = cloneData();
    data.certifications[1].featuredOrder = 1;
    assert.throws(() => validatePortfolioData(data), /duplicate featured orders/i);
  });

  await context.test('featured orders cannot contain gaps', () => {
    const data = cloneData();
    data.certifications[1].featuredOrder = null;
    assert.throws(
      () => validatePortfolioData(data),
      /exactly three featured records|owner-approved/i,
    );
  });

  await context.test('remaining records cannot acquire a featured order', () => {
    const data = cloneData();
    data.certifications[2].featuredOrder = null;
    data.certifications[3].featuredOrder = 3;
    assert.throws(() => validatePortfolioData(data), /owner-approved|featured order/i);
  });

  await context.test('status is null without an expiry', () => {
    const data = cloneData();
    data.certifications[4].credentialStatus = 'active';
    assert.throws(() => validatePortfolioData(data), /must be null when expiresDate is null/i);
  });

  await context.test('expiry requires an explicit supported status', () => {
    const data = cloneData();
    data.certifications[0].credentialStatus = null;
    assert.throws(() => validatePortfolioData(data), /must be active or expired/i);
  });

  await context.test('expiry requires a valid month', () => {
    const data = cloneData();
    data.certifications[0].expiresDate = '2027-13';
    assert.throws(() => validatePortfolioData(data), /valid YYYY-MM/i);
  });

  await context.test('expiry rejects an unsupported status', () => {
    const data = cloneData();
    data.certifications[0].credentialStatus = 'current';
    assert.throws(() => validatePortfolioData(data), /must be active or expired/i);
  });
});

test('certification records reject recovered or private credential fields', async (context) => {
  for (const field of [
    'image',
    'description',
    'skills',
    'credentialId',
    'badgeId',
    'verificationCode',
    'qrCode',
    'privateIdentifier',
  ]) {
    await context.test(field, () => {
      const data = cloneData();
      data.certifications[0][field] = 'not publish-safe';
      assert.throws(
        () => validatePortfolioData(data),
        /not part of the publish-safe contract|forbidden private or service-identifier field/i,
      );
    });
  }
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

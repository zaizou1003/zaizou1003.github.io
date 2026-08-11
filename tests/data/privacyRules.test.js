import test from 'node:test';
import assert from 'node:assert/strict';

import { assertImage, portfolioData, validatePortfolioData } from '../../src/data/index.js';
import { containsPhoneLikeValue } from '../../src/validation/privacy.js';

function cloneData() {
  return structuredClone(portfolioData);
}

test('forbidden personal and service fields fail across all publication statuses', async (context) => {
  const forbiddenFields = [
    'telephone',
    'gender',
    'nationality',
    'birthDate',
    'streetAddress',
    'password',
    'token',
    'apiKey',
    'serviceId',
    'privateIdentifier',
  ];

  for (const field of forbiddenFields) {
    await context.test(field, () => {
      const data = cloneData();
      data.projects[0].publicationStatus = 'withheld';
      data.projects[0][field] = 'redacted-test-value';
      assert.throws(() => validatePortfolioData(data), /forbidden private|publish-safe contract/i);
    });
  }
});

test('credential-like values fail even inside otherwise allowed prose', () => {
  const data = cloneData();
  data.projects[0].detailedDescription.push('api_key=redacted-test-value');
  assert.throws(() => validatePortfolioData(data), /credential-like private content/i);
});

test('unsafe schemes, signed parameters and URL shorteners fail', async (context) => {
  const unsafeUrls = [
    'javascript:alert(1)',
    'data:text/plain,unsafe',
    'file:///private/file',
    'http://example.com/resource',
    'https://example.com/resource?token=redacted',
    'https://example.com/resource?expires=9999999999',
    'https://example.com/resource?page=1',
    'https://example.com/resource#section',
    'https://example.com/resource#authorization=redacted',
    'https://bit.ly/example',
    'https://bit.ly./example',
    'https://Sub.Bit.Ly./example',
  ];

  for (const unsafeUrl of unsafeUrls) {
    await context.test(new URL(unsafeUrl, 'https://test.invalid').protocol + unsafeUrl.slice(0, 8), () => {
      const data = cloneData();
      data.profile.links.linkedin.href = unsafeUrl;
      assert.throws(
        () => validatePortfolioData(data),
        /HTTPS|parameters|fragments|shortener|absolute, stable URL|signed or expiring URL/i,
      );
    });
  }
});

test('unapproved employer or private repository URLs fail', () => {
  const data = cloneData();
  data.projects[0].repositoryUrl = 'https://github.com/vroomvroom/internal-agent';
  assert.throws(() => validatePortfolioData(data), /owner-approved public repository/i);
});

test('experience records cannot acquire repository fields', () => {
  const data = cloneData();
  data.experience[1].repositoryUrl = 'https://github.com/zaizou1003/example';
  assert.throws(() => validatePortfolioData(data), /publish-safe contract/i);
});

test('the unapproved Ayming metric fails', () => {
  const data = cloneData();
  data.experience[0].highlights.push('An approximate 60% internal metric.');
  assert.throws(() => validatePortfolioData(data), /unapproved Ayming metric/i);
});

test('all textual variants of the unapproved Ayming metric fail', async (context) => {
  const variants = ['60%', '60 percent', '60 per-cent', 'sixty percent', 'sixty-per-cent'];
  for (const variant of variants) {
    await context.test(variant, () => {
      const data = cloneData();
      data.experience[0].highlights.push(`A redacted internal claim of ${variant}.`);
      assert.throws(() => validatePortfolioData(data), /unapproved Ayming metric/i);
    });
  }
});

test('continuous MetaMind fairness claims fail', () => {
  const data = cloneData();
  data.projects[2].detailedDescription.push('The system performs continuous fairness auditing.');
  assert.throws(() => validatePortfolioData(data), /must not claim/i);
});

test('MetaMind automatic and persistent fairness-audit variants fail', async (context) => {
  const variants = ['automatic fairness auditing', 'ongoing fairness review', 'always-on fairness monitoring', 'scheduled fairness audits'];
  for (const variant of variants) {
    await context.test(variant, () => {
      const data = cloneData();
      data.projects[2].detailedDescription.push(`The system provides ${variant}.`);
      assert.throws(() => validatePortfolioData(data), /must not claim/i);
    });
  }
});

test('VroomVroom cannot be represented as a personal project', () => {
  const data = cloneData();
  data.experience[1].summary = 'A personal project delivering an AI assistant.';
  assert.throws(() => validatePortfolioData(data), /personal or individual project/i);
});

test('VroomVroom cannot be added to the personal project collection', () => {
  const data = cloneData();
  data.projects[0].evidenceResults[0].method += ' VroomVroom.';
  assert.throws(() => validatePortfolioData(data), /professional experience, not a project/i);
});

test('phone-like prose is rejected for every publication status without echoing the value', async (context) => {
  const redactedFixture = '+999 000 000 000';
  for (const publicationStatus of ['draft', 'evidence-pending', 'published', 'withheld']) {
    await context.test(publicationStatus, () => {
      const data = cloneData();
      data.projects[0].publicationStatus = publicationStatus;
      data.projects[0].summary += ` Contact ${redactedFixture}.`;
      let errorMessage = '';
      assert.throws(
        () => validatePortfolioData(data),
        (error) => {
          errorMessage = error.message;
          return /phone-like private content/i.test(errorMessage);
        },
      );
      assert.equal(errorMessage.includes(redactedFixture), false);
    });
  }
});

test('approved percentages, decimal metrics, dates and tool counts are not phone false positives', () => {
  assert.equal(validatePortfolioData(portfolioData), true);
  for (const publicNumericText of [
    '2025-06-01',
    '01-06-2025',
    '17.12%',
    '119.86%',
    '0.750',
    '16.843% ± 3.517%',
    '12+ tools',
  ]) {
    assert.equal(containsPhoneLikeValue(publicNumericText), false);
  }
});

test('common separated phone-like prose is rejected', () => {
  const data = cloneData();
  data.projects[1].summary += ' Contact 000-000-0000.';
  assert.throws(() => validatePortfolioData(data), /phone-like private content/i);
});

test('image and srcSet contracts reject remote, signed, traversal and malformed candidates', async (context) => {
  const baseImage = {
    src: '/images/projects/example.webp',
    srcSet: '/images/projects/example-small.webp 640w, /images/projects/example.webp 1200w',
    sizes: '(max-width: 640px) 100vw, 50vw',
    alt: 'Approved fixture',
    width: 1200,
    height: 675,
  };
  assert.doesNotThrow(() => assertImage(baseImage));
  assert.doesNotThrow(() =>
    assertImage({
      ...baseImage,
      srcSet: '/images/projects/example-small.webp 1x, /images/projects/example.webp 2x',
    }),
  );

  const invalidSrcSets = [
    'https://example.com/image.webp 1x',
    '/images/projects/example.webp?token=redacted 1x',
    '/images/../private/image.webp 1x',
    '/images\\projects\\example.webp 1x',
    '/images/projects/example.webp 0w',
    '/images/projects/example.webp -1x',
    '/images/projects/example.webp 1.0w',
    '/images/projects/example.webp 1x, /images/projects/other.webp 1x',
    '/images/projects/example.webp 1x, /images/projects/other.webp 1.0x',
    '/images/projects/example.webp 640w, /images/projects/other.webp 2x',
  ];
  for (const srcSet of invalidSrcSets) {
    await context.test(srcSet.slice(0, 32), () => {
      assert.throws(() => assertImage({ ...baseImage, srcSet }), /srcSet|local image path|descriptor/i);
    });
  }
});

test('sizes accepts conservative widths and rejects executable or malformed syntax', () => {
  const image = {
    src: '/images/projects/example.webp',
    alt: 'Approved fixture',
    width: 1200,
    height: 675,
  };
  assert.doesNotThrow(() => assertImage({ ...image, sizes: '(min-width: 64rem) 50vw, 100vw' }));
  for (const sizes of ['url(javascript:alert(1))', '(max-width: 640px) calc(100vw)', '100vw; color:red', '']) {
    assert.throws(() => assertImage({ ...image, sizes }), /sizes|non-empty string/i);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertAllowedArtifactFilename,
  assertPublishSafeArtifactText,
} from '../../scripts/verify-dist.mjs';
import { inspectArtifactText } from '../../src/validation/privacy.js';

test('dist privacy inspection detects each protected artifact class', async (context) => {
  const fixtures = [
    ['credential-like-value', 'api_key=redacted-test-value'],
    ['phone-like-value', 'Call +999 000 000 000'],
    ['signed-or-expiring-url', 'https://example.invalid/item#signature=redacted'],
    ['private-field-marker', 'telephone: redacted-test-value'],
    ['service-identifier', 'firebase'],
    ['source-map-reference', 'sourceMappingURL=app.js.map'],
    ['recovery-private-path', 'src/utils/cv.pdf'],
  ];
  for (const [rule, fixture] of fixtures) {
    await context.test(rule, () => assert.ok(inspectArtifactText(fixture).includes(rule)));
  }
});

test('approved public facts and metrics do not trigger artifact privacy rules', () => {
  const publicText = [
    'mailto:Ahmedazizbenaissa@gmail.com',
    'Ayming and VroomVroom',
    '17.12% and 119.86%',
    '16.843% ± 3.517%',
    '12+ tools and 10-seed results',
  ].join(' ');
  assert.deepEqual(inspectArtifactText(publicText), []);
});

test('artifact extension allowlist and private filenames are enforced', () => {
  assert.doesNotThrow(() => assertAllowedArtifactFilename('assets/site.webp'));
  assert.throws(() => assertAllowedArtifactFilename('assets/site.map'), /artifact-extension/);
  assert.throws(() => assertAllowedArtifactFilename('assets/certificate.png'), /private-artifact-filename/);
});

test('artifact failures report only the rule and filename, never the matched value', () => {
  const redactedFixture = 'api_key=redacted-test-value';
  let message = '';
  assert.throws(
    () => assertPublishSafeArtifactText(redactedFixture, 'assets/example.js'),
    (error) => {
      message = error.message;
      return /credential-like-value: assets\/example\.js/.test(message);
    },
  );
  assert.equal(message.includes('redacted-test-value'), false);
});

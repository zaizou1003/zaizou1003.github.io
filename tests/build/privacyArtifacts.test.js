import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertAllowedArtifactFilename,
  assertPublishSafeArtifactText,
  normalizeJavaScriptForArtifactReview,
} from '../../scripts/verify-dist.mjs';
import { inspectArtifactText } from '../../src/validation/privacy.js';
import { iconDefinitions } from '../../src/components/ui/iconPaths.js';

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

test('valid SVG path coordinates are not phone data while visible phone-like text remains blocked', () => {
  assert.doesNotThrow(() =>
    assertPublishSafeArtifactText('<svg><path d="M12,2.75a9.25,9.25,0,0,0-2.93,18.03"></path></svg>', 'index.html'),
  );
  assert.throws(
    () =>
      assertPublishSafeArtifactText(
        '<svg><path d="not-path redacted"></path></svg><p>Call +999 000 000 000</p>',
        'index.html',
      ),
    /phone-like-value/,
  );
});

test('verified JavaScript regex quantifiers are not mistaken for private phone values', () => {
  const source = String.raw`const pattern = /\b\d{2,4}(?:[\s().-]+\d{2,4}){2,5}\b/;`;
  assert.doesNotThrow(() =>
    assertPublishSafeArtifactText(source, 'assets/validation.js'),
  );
  const normalized = normalizeJavaScriptForArtifactReview(source).content;
  assert.equal(normalized.includes('{2,4}'), false);
  assert.equal(normalized.includes('{2,5}'), false);
});

test('every approved icon path is exempt only as a complete JavaScript literal payload', () => {
  const paths = Object.values(iconDefinitions).flatMap((definition) => definition.paths);
  const sources = [
    paths.map((path) => `'${path}'`).join(','),
    paths.map((path) => JSON.stringify(path)).join(','),
    paths.map((path) => `\`${path}\``).join(','),
  ];

  for (const source of sources) {
    assert.doesNotThrow(() =>
      assertPublishSafeArtifactText(`const approvedPaths = [${source}];`, 'assets/icons.js'),
    );
  }
});

test('approved path substrings remain scanned in longer strings and arbitrary JavaScript', async (context) => {
  const path = iconDefinitions.github.paths[0];
  const fixtures = [
    ['longer single-quoted string', `const visible = 'Visible prefix ${path} suffix';`],
    ['longer double-quoted string', `const visible = "Visible prefix ${path} suffix";`],
    ['longer template literal', `const visible = \`Visible prefix ${path} suffix\`;`],
    ['unquoted arbitrary content', `const arbitrary = ${path};`],
  ];

  for (const [name, source] of fixtures) {
    await context.test(name, () => {
      assert.throws(
        () => assertPublishSafeArtifactText(source, 'assets/visible-content.js'),
        /phone-like-value/,
      );
    });
  }
});

test('phone-like values cannot be concealed beside or across an approved path literal', async (context) => {
  const path = JSON.stringify(iconDefinitions.github.paths[0]);
  const fixtures = [
    ['before', `const visible = 'Call +999 000 000 000 ' + ${path};`],
    ['after', `const visible = ${path} + ' Call +999 000 000 000';`],
    ['split around path', `const visible = 'Call +999 000 ' + ${path} + ' 000 000';`],
  ];

  for (const [name, source] of fixtures) {
    await context.test(name, () => {
      assert.throws(
        () => assertPublishSafeArtifactText(source, 'assets/visible-content.js'),
        /phone-like-value/,
      );
    });
  }
});

test('brace-number text in visible JavaScript strings is never normalized', () => {
  const source = String.raw`const visible = '{8} and {2,4}';`;
  assert.equal(normalizeJavaScriptForArtifactReview(source).content, source);
  assert.doesNotThrow(() =>
    assertPublishSafeArtifactText(source, 'assets/visible-content.js'),
  );
  assert.throws(
    () =>
      assertPublishSafeArtifactText(
        String.raw`const visible = 'Call +999 000 000 000 with {8} and {2,4}';`,
        'assets/visible-content.js',
      ),
    /phone-like-value/,
  );
});

test('JavaScript exemptions preserve every sensitive-value rule', async (context) => {
  const fixtures = [
    ['phone-like-value', `const visible = 'Call +999 000 000 000';`],
    ['credential-like-value', `const visible = 'api_key=redacted-test-value';`],
    [
      'signed-or-expiring-url',
      `const visible = 'https://example.invalid/item#signature=redacted';`,
    ],
    ['service-identifier', `const visible = 'firebase';`],
  ];

  for (const [rule, source] of fixtures) {
    await context.test(rule, () => {
      assert.throws(
        () => assertPublishSafeArtifactText(source, 'assets/visible-content.js'),
        new RegExp(rule),
      );
    });
  }
});

test('HTML and CSS receive no JavaScript literal or regex exemptions', async (context) => {
  const path = iconDefinitions.github.paths[0];
  await context.test('visible HTML path', () => {
    assert.throws(
      () => assertPublishSafeArtifactText(`<p>${path}</p>`, 'index.html'),
      /phone-like-value/,
    );
  });
  await context.test('visible HTML phone', () => {
    assert.throws(
      () => assertPublishSafeArtifactText('<p>Call +999 000 000 000</p>', 'index.html'),
      /phone-like-value/,
    );
  });
  await context.test('visible CSS path', () => {
    assert.throws(
      () => assertPublishSafeArtifactText(`.icon::before { content: "${path}"; }`, 'assets/site.css'),
      /phone-like-value/,
    );
  });
  await context.test('visible CSS phone', () => {
    assert.throws(
      () =>
        assertPublishSafeArtifactText(
          '.contact::before { content: "+999 000 000 000"; }',
          'assets/site.css',
        ),
      /phone-like-value/,
    );
  });
});

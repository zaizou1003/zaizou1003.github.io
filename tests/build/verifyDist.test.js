import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ROOT_END_SENTINEL,
  extractRootMarkup,
  verifyPageHtml,
} from '../../scripts/verify-dist.mjs';

const contract = { id: 'home', relativeFile: 'index.html', heading: 'Ahmed Aziz Ben Aissa' };
const completeMarkup =
  '<div data-static-page="home"><nav data-hydrate-navigation></nav><main><div><h1>Ahmed Aziz Ben Aissa</h1></div></main><footer>Footer</footer></div>';

function documentWith(rootContent, { beforeBoundary = '', boundary = ROOT_END_SENTINEL } = {}) {
  return `<!doctype html><html><body><div id="root">${rootContent}</div>${beforeBoundary}${boundary}<script type="module" src="/client.js"></script></body></html>`;
}

test('production verifier accepts a complete mount with nested div elements', () => {
  const html = documentWith(completeMarkup);
  assert.equal(extractRootMarkup(html, 'fixture'), completeMarkup);
  assert.doesNotThrow(() => verifyPageHtml(html, contract));
});

test('empty root with populated sibling fails exact-boundary verification', () => {
  const html = documentWith('', { beforeBoundary: completeMarkup });
  assert.throws(() => verifyPageHtml(html, contract), /outside #root|empty/i);
});

test('whitespace, comment-only and loading-only mounts fail', async (context) => {
  const fixtures = ['   \n ', '<!-- static placeholder -->', 'Loading...', 'Please wait'];
  for (const content of fixtures) {
    await context.test(content.trim() || 'whitespace', () => {
      assert.throws(
        () => verifyPageHtml(documentWith(content, { beforeBoundary: completeMarkup }), contract),
        /outside #root|empty|comment|loading shell/i,
      );
    });
  }
});

test('missing and duplicate root openings fail', async (context) => {
  await context.test('missing root', () => {
    const html = documentWith(completeMarkup).replace('id="root"', 'id="other"');
    assert.throws(() => verifyPageHtml(html, contract), /exactly one #root opening/i);
  });
  await context.test('duplicate root', () => {
    const html = documentWith(`<div id="root"></div>${completeMarkup}`);
    assert.throws(() => verifyPageHtml(html, contract), /exactly one #root opening/i);
  });
});

test('missing and duplicate root-end boundaries fail', async (context) => {
  await context.test('missing boundary', () => {
    assert.throws(
      () => verifyPageHtml(documentWith(completeMarkup, { boundary: '' }), contract),
      /exactly one root-end boundary/i,
    );
  });
  await context.test('duplicate boundary', () => {
    assert.throws(
      () =>
        verifyPageHtml(
          documentWith(completeMarkup, { boundary: `${ROOT_END_SENTINEL}${ROOT_END_SENTINEL}` }),
          contract,
        ),
      /exactly one root-end boundary/i,
    );
  });
});

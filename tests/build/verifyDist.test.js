import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ROOT_END_SENTINEL,
  extractRootMarkup,
  verifyPageHtml,
} from '../../scripts/verify-dist.mjs';
import { projects } from '../../src/data/projects.js';

const contract = { id: 'home', relativeFile: 'index.html', heading: 'Ahmed Aziz Ben Aissa' };

function primaryLinks(pageId) {
  const prefix = pageId === 'home' ? '' : '/';
  return [
    [`${prefix}#capabilities`, 'Capabilities'],
    [`${prefix}#featured-projects`, 'Projects'],
    [`${prefix}#experience`, 'Experience'],
    [`${prefix}#skills`, 'Skills'],
    [`${prefix}#certifications`, 'Certifications'],
    [`${prefix}#education`, 'Education'],
    [`${prefix}#contact`, 'Contact'],
    ['/projects/', 'All projects'],
  ]
    .map(([href, label]) => `<li><a href="${href}">${label}</a></li>`)
    .join('');
}

function completeMarkup(pageId = 'home') {
  const heading = pageId === 'home' ? 'Ahmed Aziz Ben Aissa' : 'Projects';
  return [
    '<a class="skip-link" href="#main">Skip to main content</a>',
    '<header><div data-hydrate-navigation>',
    '<nav aria-label="Primary"><details><summary>Menu</summary>',
    `<ul>${primaryLinks(pageId)}</ul></details></nav>`,
    '</div></header>',
    `<main id="main" data-static-page="${pageId}"><div><h1>${heading}</h1></div></main>`,
    '<footer><ul data-footer-contacts="">',
    '<li><a href="mailto:Ahmedazizbenaissa@gmail.com" data-contact-kind="email">Email</a></li>',
    '<li><a href="https://www.linkedin.com/in/ahmed-ben-aissa-5b34992a3/" data-contact-kind="linkedin">LinkedIn</a></li>',
    '<li><a href="https://github.com/zaizou1003" data-contact-kind="github">GitHub</a></li>',
    '</ul></footer>',
  ].join('');
}

function documentWith(rootContent, { beforeBoundary = '', boundary = ROOT_END_SENTINEL } = {}) {
  return `<!doctype html><html><body><div id="root">${rootContent}</div>${beforeBoundary}${boundary}<script type="module" src="/client.js"></script></body></html>`;
}

test('production verifier accepts a complete mount with nested div elements', () => {
  const markup = completeMarkup();
  const html = documentWith(markup);
  assert.equal(extractRootMarkup(html, 'fixture'), markup);
  assert.doesNotThrow(() => verifyPageHtml(html, contract));
});

test('empty root with populated sibling fails exact-boundary verification', () => {
  const html = documentWith('', { beforeBoundary: completeMarkup() });
  assert.throws(() => verifyPageHtml(html, contract), /outside #root|empty/i);
});

test('whitespace, comment-only and loading-only mounts fail', async (context) => {
  const fixtures = ['   \n ', '<!-- static placeholder -->', 'Loading...', 'Please wait'];
  for (const content of fixtures) {
    await context.test(content.trim() || 'whitespace', () => {
      assert.throws(
        () => verifyPageHtml(documentWith(content, { beforeBoundary: completeMarkup() }), contract),
        /outside #root|empty|comment|loading shell/i,
      );
    });
  }
});

test('missing and duplicate root openings fail', async (context) => {
  await context.test('missing root', () => {
    const html = documentWith(completeMarkup()).replace('id="root"', 'id="other"');
    assert.throws(() => verifyPageHtml(html, contract), /exactly one #root opening/i);
  });
  await context.test('duplicate root', () => {
    const html = documentWith(`<div id="root"></div>${completeMarkup()}`);
    assert.throws(() => verifyPageHtml(html, contract), /exactly one #root opening/i);
  });
});

test('missing and duplicate root-end boundaries fail', async (context) => {
  await context.test('missing boundary', () => {
    assert.throws(
      () => verifyPageHtml(documentWith(completeMarkup(), { boundary: '' }), contract),
      /exactly one root-end boundary/i,
    );
  });
  await context.test('duplicate boundary', () => {
    assert.throws(
      () =>
        verifyPageHtml(
          documentWith(completeMarkup(), { boundary: `${ROOT_END_SENTINEL}${ROOT_END_SENTINEL}` }),
          contract,
        ),
      /exactly one root-end boundary/i,
    );
  });
});

test('static shell verification requires the skip link and labelled primary navigation', async (context) => {
  await context.test('skip link', () => {
    const html = documentWith(completeMarkup().replace('class="skip-link"', 'class="removed"'));
    assert.throws(() => verifyPageHtml(html, contract), /one skip link/i);
  });
  await context.test('primary label', () => {
    const html = documentWith(completeMarkup().replace('aria-label="Primary"', ''));
    assert.throws(() => verifyPageHtml(html, contract), /labelled primary navigation/i);
  });
});

test('projects shell uses root-form homepage anchors', () => {
  const projectsContract = {
    id: 'projects',
    relativeFile: 'projects/index.html',
    heading: 'Projects',
  };
  assert.doesNotThrow(() => verifyPageHtml(documentWith(completeMarkup('projects')), projectsContract));
  assert.match(completeMarkup('projects'), /href="\/#experience"/);
});

test('static shell verification requires all three approved contact types', () => {
  const html = documentWith(
    completeMarkup().replace('data-contact-kind="github"', 'data-contact-kind="removed"'),
  );
  assert.throws(() => verifyPageHtml(html, contract), /approved GitHub contact link/i);
});

test('Milestone 3 static shell rejects publication-gated project records', () => {
  const html = documentWith(
    completeMarkup().replace('</main>', `<p>${projects[0].title}</p></main>`),
  );
  assert.throws(() => verifyPageHtml(html, contract), /publication-gated project/i);
});

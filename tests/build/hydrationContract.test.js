import test from 'node:test';
import assert from 'node:assert/strict';

import { createHydrationMismatchFixture } from '../../scripts/verify-browser.mjs';

test('the browser gate creates a deliberate mismatch inside the real hydration island', () => {
  const html =
    '<div data-hydrate-navigation><nav><a href="/">Home</a></nav></div><main><h1>Home</h1></main>';
  const fixture = createHydrationMismatchFixture(html);
  assert.match(fixture, /Hydration mismatch fixture/);
  assert.notEqual(fixture, html);
});

test('mismatch fixture creation fails closed when the hydration island is absent', () => {
  assert.throws(() => createHydrationMismatchFixture('<main>Home</main>'), /navigation island is missing/i);
});

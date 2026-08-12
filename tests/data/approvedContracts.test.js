import test from 'node:test';
import assert from 'node:assert/strict';

import { portfolioData, validatePortfolioData } from '../../src/data/index.js';

function cloneData() {
  return structuredClone(portfolioData);
}

test('approved public contact destinations are exact field-level contracts', () => {
  const data = cloneData();
  data.profile.links.github.href = 'https://github.com/changed-owner';
  assert.throws(() => validatePortfolioData(data), /profile\.links\.github\.href.*owner-approved/i);
});

test('profile narrative and capability evidence references cannot drift', async (context) => {
  await context.test('profile summary', () => {
    const data = cloneData();
    data.profile.summary = 'Changed homepage support statement.';
    assert.throws(() => validatePortfolioData(data), /profile\.summary.*owner-approved/i);
  });
  await context.test('capability order', () => {
    const data = cloneData();
    data.capabilities[0].displayOrder = 4;
    assert.throws(() => validatePortfolioData(data), /duplicate display orders|owner-approved/i);
  });
  await context.test('capability project evidence', () => {
    const data = cloneData();
    data.capabilities[1].evidenceProjectIds = ['metamind-responsible-ai-learning-companion'];
    assert.throws(() => validatePortfolioData(data), /owner-approved/i);
  });
});

test('flagship evidence and role fields cannot drift', async (context) => {
  await context.test('evidence value', () => {
    const data = cloneData();
    data.projects[1].evidenceResults[0].value = '18.00%';
    assert.throws(() => validatePortfolioData(data), /projects\[1\]\.evidenceResults\[0\]\.value.*owner-approved/i);
  });
  await context.test('individual role', () => {
    const data = cloneData();
    data.projects[0].role = 'Team project.';
    assert.throws(() => validatePortfolioData(data), /projects\[0\]\.role.*owner-approved/i);
  });
});

test('experience, certification and education fields are owner-locked', async (context) => {
  await context.test('experience location', () => {
    const data = cloneData();
    data.experience[0].location = 'Remote';
    assert.throws(() => validatePortfolioData(data), /experience\[0\]\.location.*owner-approved/i);
  });
  await context.test('certification issue date', () => {
    const data = cloneData();
    data.certifications[0].issuedDate = '2026-06';
    assert.throws(() => validatePortfolioData(data), /certifications\[0\]\.issuedDate.*owner-approved/i);
  });
  await context.test('education location', () => {
    const data = cloneData();
    data.education[1].location = 'Changed';
    assert.throws(() => validatePortfolioData(data), /education\[1\]\.location.*owner-approved/i);
  });
});

test('MetaMind keeps user-triggered audit mode and explicit not-evaluated limitations', async (context) => {
  await context.test('audit mode', () => {
    const data = cloneData();
    data.projects[2].fairnessAuditMode = 'automatic';
    assert.throws(() => validatePortfolioData(data), /fairnessAuditMode.*user-triggered/i);
  });
  await context.test('learning effectiveness', () => {
    const data = cloneData();
    data.projects[2].evaluationStatus.learningEffectiveness = 'evaluated';
    assert.throws(() => validatePortfolioData(data), /evaluationStatus.*not-evaluated/i);
  });
});

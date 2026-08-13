import test from 'node:test';
import assert from 'node:assert/strict';

import { portfolioData, validatePortfolioData } from '../../src/data/index.js';

const APPROVED_CERTIFICATIONS = [
  ['microsoft-azure-ai-apps-agents-developer-associate', 'Microsoft Certified: Azure AI Apps and Agents Developer Associate', 'Microsoft', '2026-07', '2027-07', 'active', 1],
  ['anthropic-introduction-to-model-context-protocol', 'Introduction to Model Context Protocol', 'Anthropic', '2026-03', null, null, 2],
  ['hugging-face-ai-agent-course', 'AI Agent Course', 'Hugging Face', '2025-04', null, null, 3],
  ['microsoft-azure-data-scientist-associate', 'Microsoft Certified: Azure Data Scientist Associate', 'Microsoft', '2025-07', '2026-07', 'expired', null],
  ['google-connect-protect-networks-network-security', 'Connect and Protect: Networks and Network Security', 'Google', '2025-03', null, null, null],
  ['google-play-it-safe-manage-security-risks', 'Play It Safe: Manage Security Risks', 'Google', '2025-03', null, null, null],
  ['google-coursera-foundations-cybersecurity', 'Foundations of Cybersecurity', 'Google (Coursera)', '2025-02', null, null, null],
  ['hugging-face-ai-agents-fundamentals', 'AI Agents Fundamentals', 'Hugging Face', '2025-02', null, null, null],
  ['nvidia-fundamentals-deep-learning', 'Fundamentals of Deep Learning', 'NVIDIA', '2024-09', null, null, null],
  ['nvidia-applications-ai-predictive-maintenance', 'Applications of AI for Predictive Maintenance', 'NVIDIA', '2024-07', null, null, null],
  ['nvidia-building-transformer-based-nlp-applications', 'Building Transformer-Based NLP Applications', 'NVIDIA', '2024-06', null, null, null],
];

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

test('all eleven certification facts and publication decisions are owner-locked', () => {
  assert.deepEqual(
    portfolioData.certifications.map((record) => [
      record.id,
      record.title,
      record.issuer,
      record.issuedDate,
      record.expiresDate,
      record.credentialStatus,
      record.featuredOrder,
    ]),
    APPROVED_CERTIFICATIONS,
  );
  assert.ok(
    portfolioData.certifications.every(
      (record) => record.credentialUrl === null && record.publicationStatus === 'published',
    ),
  );
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

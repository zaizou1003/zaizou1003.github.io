import { deepFreeze } from './schemas.js';

export const certifications = deepFreeze([
  {
    id: 'microsoft-azure-ai-apps-agents-developer-associate',
    title: 'Microsoft Certified: Azure AI Apps and Agents Developer Associate',
    issuer: 'Microsoft',
    issuedDate: '2026-07',
    expiresDate: '2027-07',
    credentialUrl: null,
    featuredOrder: 1,
    publicationStatus: 'published',
  },
  {
    id: 'anthropic-introduction-to-model-context-protocol',
    title: 'Introduction to Model Context Protocol',
    issuer: 'Anthropic',
    issuedDate: '2026-03',
    credentialUrl: null,
    featuredOrder: 2,
    publicationStatus: 'published',
  },
  {
    id: 'hugging-face-ai-agent-course',
    title: 'AI Agent Course',
    issuer: 'Hugging Face',
    issuedDate: '2025-04',
    credentialUrl: null,
    featuredOrder: 3,
    publicationStatus: 'published',
  },
]);

import { deepFreeze } from './schemas.js';

export const experience = deepFreeze([
  {
    id: 'ayming-ai-engineer-apprenticeship',
    employer: 'Ayming',
    roleTitle: 'AI Engineer',
    employmentType: 'apprenticeship',
    startDate: '2025-10',
    endDate: null,
    location: 'Paris, France',
    summary: 'Building enterprise AI systems for knowledge retrieval and workflow automation.',
    highlights: [
      'Developing workflows for company enrichment and technology detection.',
      'Building AI tools supporting grant analysis and consultant decision-making.',
    ],
    technologies: ['Python', 'SnapLogic', 'Amazon OpenSearch', 'LLMs', 'Dify', 'REST APIs'],
    capabilityRefs: ['agentic-ai', 'rag', 'production-ai', 'data-systems'],
    publicationStatus: 'published',
  },
  {
    id: 'vroomvroom-ai-systems-engineer-internship',
    employer: 'VroomVroom',
    roleTitle: 'AI Systems Engineer',
    employmentType: 'internship',
    startDate: '2025-06',
    endDate: '2025-08',
    location: 'Paris, France',
    summary:
      'Built a production-oriented AI assistant orchestrating tools and APIs for multi-step user workflows.',
    highlights: [
      'Developed a modular AI agent architecture integrating 12+ tools.',
      'Built ingestion pipelines for thousands of driving-school records and reviews.',
      'Contributed to backend integration, containerization and deployment.',
    ],
    technologies: [
      'Python',
      'FastAPI',
      'Mistral API',
      'LlamaIndex',
      'ChromaDB',
      'MongoDB',
      'MCP',
      'Docker',
    ],
    capabilityRefs: ['agentic-ai', 'mcp', 'production-ai', 'data-systems'],
    confidentialityNote: 'Employer work; implementation details and source code are not public.',
    publicationStatus: 'published',
  },
]);

import { deepFreeze } from './schemas.js';

export const skills = deepFreeze([
  {
    id: 'agent-retrieval-systems',
    title: 'Agent and retrieval systems',
    description: 'Capabilities grounded in approved agent, retrieval and workflow evidence.',
    displayOrder: 1,
    skills: [
      {
        name: 'Agent orchestration',
        evidenceProjectIds: [
          'european-air-quality-evidence-agent',
          'metamind-responsible-ai-learning-companion',
        ],
        evidenceExperienceIds: ['vroomvroom-ai-systems-engineer-internship'],
      },
      {
        name: 'MCP integration',
        evidenceProjectIds: ['european-air-quality-evidence-agent'],
        evidenceExperienceIds: ['vroomvroom-ai-systems-engineer-internship'],
      },
      {
        name: 'Retrieval and evidence grounding',
        evidenceProjectIds: ['european-air-quality-evidence-agent'],
        evidenceExperienceIds: ['ayming-ai-engineer-apprenticeship'],
      },
    ],
  },
  {
    id: 'ai-ml-research-evaluation',
    title: 'AI/ML research and evaluation',
    description: 'Research methods and evaluation practices tied to approved project evidence.',
    displayOrder: 2,
    skills: [
      {
        name: 'Reinforcement learning experiments',
        evidenceProjectIds: ['finrl-deepseek-research-extension'],
        evidenceExperienceIds: [],
      },
      {
        name: 'Multi-seed evaluation',
        evidenceProjectIds: ['finrl-deepseek-research-extension'],
        evidenceExperienceIds: [],
      },
      {
        name: 'Responsible AI evaluation',
        evidenceProjectIds: [
          'european-air-quality-evidence-agent',
          'metamind-responsible-ai-learning-companion',
        ],
        evidenceExperienceIds: [],
      },
    ],
  },
  {
    id: 'production-data-engineering',
    title: 'Production and data engineering',
    description: 'Production capabilities evidenced by approved professional responsibilities.',
    displayOrder: 3,
    skills: [
      {
        name: 'API-backed AI systems',
        evidenceProjectIds: [],
        evidenceExperienceIds: [
          'ayming-ai-engineer-apprenticeship',
          'vroomvroom-ai-systems-engineer-internship',
        ],
      },
      {
        name: 'Data ingestion pipelines',
        evidenceProjectIds: [],
        evidenceExperienceIds: ['vroomvroom-ai-systems-engineer-internship'],
      },
      {
        name: 'Search and persistent data systems',
        evidenceProjectIds: ['metamind-responsible-ai-learning-companion'],
        evidenceExperienceIds: [
          'ayming-ai-engineer-apprenticeship',
          'vroomvroom-ai-systems-engineer-internship',
        ],
      },
      {
        name: 'Containerization',
        evidenceProjectIds: [],
        evidenceExperienceIds: ['vroomvroom-ai-systems-engineer-internship'],
      },
    ],
  },
  {
    id: 'programming-foundations',
    title: 'Programming foundations',
    description: 'Programming foundations used across the approved work record.',
    displayOrder: 4,
    skills: [
      {
        name: 'Python',
        evidenceProjectIds: ['finrl-deepseek-research-extension'],
        evidenceExperienceIds: [
          'ayming-ai-engineer-apprenticeship',
          'vroomvroom-ai-systems-engineer-internship',
        ],
      },
      {
        name: 'REST APIs',
        evidenceProjectIds: [],
        evidenceExperienceIds: [
          'ayming-ai-engineer-apprenticeship',
          'vroomvroom-ai-systems-engineer-internship',
        ],
      },
      {
        name: 'SQL-backed persistent state',
        evidenceProjectIds: ['metamind-responsible-ai-learning-companion'],
        evidenceExperienceIds: [],
      },
    ],
  },
]);

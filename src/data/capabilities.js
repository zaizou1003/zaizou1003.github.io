import { deepFreeze } from './schemas.js';

export const capabilities = deepFreeze([
  {
    id: 'agents-tool-protocols',
    title: 'Agents and tool protocols',
    description:
      'Agent orchestration and MCP tool integration grounded in reviewed individual project implementations.',
    evidenceProjectIds: [
      'european-air-quality-evidence-agent',
      'metamind-responsible-ai-learning-companion',
    ],
    displayOrder: 1,
  },
  {
    id: 'retrieval-evidence',
    title: 'Retrieval and evidence',
    description:
      'Retrieval-augmented generation, source grounding and evidence validation for research workflows.',
    evidenceProjectIds: ['european-air-quality-evidence-agent'],
    displayOrder: 2,
  },
  {
    id: 'research-evaluation',
    title: 'Research and evaluation',
    description:
      'Reproducible experiments, multi-seed evaluation and responsible-AI assessment with explicit limitations.',
    evidenceProjectIds: [
      'finrl-deepseek-research-extension',
      'metamind-responsible-ai-learning-companion',
    ],
    displayOrder: 3,
  },
  {
    id: 'production-reliability',
    title: 'Production reliability',
    description:
      'Security controls, explicit evaluation boundaries and production-oriented AI system design.',
    evidenceProjectIds: ['european-air-quality-evidence-agent'],
    displayOrder: 4,
  },
]);

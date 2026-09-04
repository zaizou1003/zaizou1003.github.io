import { deepFreeze } from './schemas.js';

export const profile = deepFreeze({
  name: 'Ahmed Aziz Ben Aissa',
  role: 'AI Systems Engineer',
  valueProposition:
    'I design and evaluate reliable AI systems that connect agents, tools, retrieval, and production workflows.',
  summary:
    'My work connects applied AI research with responsible-AI practice, measurable evaluation, explicit safety boundaries and operational reliability.',
  focusAreas: [
    'Agentic AI',
    'MCP systems',
    'Retrieval-augmented generation',
    'Applied AI research',
    'Responsible AI',
    'Production AI engineering',
    'Evaluation, safety and reliability',
  ],
  links: {
    email: {
      label: 'Email',
      href: 'mailto:Ahmedazizbenaissa@gmail.com',
      kind: 'email',
    },
    linkedin: {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/ahmed-ben-aissa-5b34992a3/',
      kind: 'linkedin',
    },
    github: {
      label: 'GitHub',
      href: 'https://github.com/zaizou1003',
      kind: 'github',
    },
  },
});

function freezeContract(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freezeContract(child);
  }
  return value;
}

export const APPROVED_PROFILE_CONTRACT = freezeContract({
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

export const APPROVED_CAPABILITY_CONTRACTS = freezeContract([
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

export const APPROVED_PROJECT_CONTRACTS = freezeContract([
  {
    id: 'european-air-quality-evidence-agent',
    title: 'European Air-Quality Evidence Agent',
    summary:
      'An agentic evidence system integrating MCP tools, retrieval, evidence validation, security controls and evaluation.',
    detailedDescription: [
      'The system connects MCP tool integration with retrieval and evidence grounding for European air-quality research.',
      'Its verified scope includes evidence validation, security controls and evaluation without an unverified numeric-results claim.',
    ],
    role:
      'Sole designer and implementer; other academic group members are not represented as technical contributors.',
    workMode: 'individual',
    technologies: ['MCP', 'Retrieval-augmented generation'],
    categories: ['agentic-ai', 'mcp', 'rag', 'responsible-ai', 'production-ai'],
    evidenceResults: [
      {
        label: 'Agent and retrieval integration',
        value: 'MCP tool integration connects retrieval with evidence grounding.',
        method: 'Implementation-scope review.',
      },
      {
        label: 'Evidence controls',
        value: 'Evidence validation and security controls are part of the reviewed implementation.',
        method: 'Implementation-scope review.',
      },
      {
        label: 'Evaluation boundary',
        value: 'Evaluation is in scope; no quantitative performance result is claimed.',
        method: 'Implementation-scope review; no numeric outcome is claimed.',
      },
    ],
    repositoryUrl: 'https://github.com/zaizou1003/Air-Quality-Agent',
    demoPaperUrl: null,
    featuredOrder: 1,
  },
  {
    id: 'finrl-deepseek-research-extension',
    title: 'FinRL–DeepSeek Research Extension',
    summary:
      'Extended FinRL–DeepSeek with a confidence-weighted, turbulence-aware signal layer for constrained PPO trading and evaluated the system through deterministic and 10-seed stochastic backtests.',
    detailedDescription: [
      'Individual Phase 1 extension and sole report authorship, with explicit attribution to the upstream FinRL–DeepSeek project.',
      'Results are historical backtests, not live-trading performance or investment advice; upstream attribution and documented evaluation limitations must remain visible.',
    ],
    role:
      'Individual Phase 1 extension and sole report authorship, with explicit attribution to the upstream FinRL–DeepSeek project.',
    workMode: 'individual',
    technologies: ['Python', 'FinRL–DeepSeek', 'PPO'],
    categories: ['applied-research', 'data-systems'],
    evidenceResults: [
      {
        label: 'Deterministic EP90 annual return',
        value: '17.12%',
        method: 'Deterministic EP90 historical backtest.',
      },
      {
        label: 'Ten-seed stochastic mean annual return',
        value: '16.843% ± 3.517%',
        method: 'Ten-seed stochastic historical backtest; mean ± standard deviation.',
      },
      {
        label: 'Ten-seed stochastic mean maximum drawdown',
        value: '−25.921% ± 1.671%',
        method: 'Ten-seed stochastic historical backtest; mean ± standard deviation.',
      },
      {
        label: 'Deterministic total return',
        value: '119.86%',
        method: 'Deterministic EP90 historical backtest.',
      },
      {
        label: 'Deterministic Sharpe ratio',
        value: '0.750',
        method: 'Deterministic EP90 historical backtest.',
      },
      {
        label: 'Ten-seed stochastic mean Sharpe ratio',
        value: '0.878 ± 0.173',
        method: 'Ten-seed stochastic historical backtest; mean ± standard deviation.',
      },
    ],
    repositoryUrl: 'https://github.com/zaizou1003/finrl-deepseek-phase1',
    demoPaperUrl: null,
    featuredOrder: 2,
  },
  {
    id: 'metamind-responsible-ai-learning-companion',
    title: 'MetaMind Responsible AI Learning Companion',
    summary:
      'A multi-agent Socratic tutoring system with persistent learner state, learning history, adaptive guidance and user-triggered fairness-audit functionality.',
    detailedDescription: [
      'Verified implementation includes a planner agent, Socratic tutor, learning-signal extractor, fairness reviewer, controller and state transitions, SQLite persistence, a CLI and a Streamlit interface.',
      'Fairness audits are user-triggered; no learning-effectiveness or fairness-outcome evaluation has been completed.',
    ],
    role: 'Individual academic project.',
    workMode: 'individual',
    technologies: ['SQLite', 'CLI', 'Streamlit'],
    categories: ['agentic-ai', 'responsible-ai'],
    evidenceResults: [
      {
        label: 'Multi-agent architecture',
        value:
          'Planner agent; Socratic tutor; learning-signal extractor; fairness reviewer; controller and state transitions.',
        method: 'Implementation-scope review.',
      },
      {
        label: 'Persistent learner state',
        value: 'SQLite persistence supports learner state and learning history across sessions.',
        method: 'Implementation-scope review of the CLI and Streamlit interfaces.',
      },
      {
        label: 'Responsible-AI boundary',
        value:
          'Fairness audits are user-triggered; learning effectiveness and fairness outcomes remain not evaluated.',
        method:
          'Implementation-scope review; no learning-effectiveness or fairness-outcome result is claimed.',
      },
    ],
    repositoryUrl: null,
    demoPaperUrl: null,
    featuredOrder: 3,
    fairnessAuditMode: 'user-triggered',
    evaluationStatus: {
      learningEffectiveness: 'not-evaluated',
      fairnessOutcomes: 'not-evaluated',
    },
  },
]);

export const APPROVED_EXPERIENCE_CONTRACTS = freezeContract([
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

export const APPROVED_CERTIFICATION_CONTRACTS = freezeContract([
  {
    id: 'microsoft-azure-ai-apps-agents-developer-associate',
    title: 'Microsoft Certified: Azure AI Apps and Agents Developer Associate',
    issuer: 'Microsoft',
    issuedDate: '2026-07',
    expiresDate: '2027-07',
    credentialStatus: 'active',
    credentialUrl: null,
    featuredOrder: 1,
    publicationStatus: 'published',
  },
  {
    id: 'anthropic-introduction-to-model-context-protocol',
    title: 'Introduction to Model Context Protocol',
    issuer: 'Anthropic',
    issuedDate: '2026-03',
    expiresDate: null,
    credentialStatus: null,
    credentialUrl: null,
    featuredOrder: 2,
    publicationStatus: 'published',
  },
  {
    id: 'hugging-face-ai-agent-course',
    title: 'AI Agent Course',
    issuer: 'Hugging Face',
    issuedDate: '2025-04',
    expiresDate: null,
    credentialStatus: null,
    credentialUrl: null,
    featuredOrder: 3,
    publicationStatus: 'published',
  },
  {
    id: 'microsoft-azure-data-scientist-associate',
    title: 'Microsoft Certified: Azure Data Scientist Associate',
    issuer: 'Microsoft',
    issuedDate: '2025-07',
    expiresDate: '2026-07',
    credentialStatus: 'expired',
    credentialUrl: null,
    featuredOrder: null,
    publicationStatus: 'published',
  },
  {
    id: 'google-connect-protect-networks-network-security',
    title: 'Connect and Protect: Networks and Network Security',
    issuer: 'Google',
    issuedDate: '2025-03',
    expiresDate: null,
    credentialStatus: null,
    credentialUrl: null,
    featuredOrder: null,
    publicationStatus: 'published',
  },
  {
    id: 'google-play-it-safe-manage-security-risks',
    title: 'Play It Safe: Manage Security Risks',
    issuer: 'Google',
    issuedDate: '2025-03',
    expiresDate: null,
    credentialStatus: null,
    credentialUrl: null,
    featuredOrder: null,
    publicationStatus: 'published',
  },
  {
    id: 'google-coursera-foundations-cybersecurity',
    title: 'Foundations of Cybersecurity',
    issuer: 'Google (Coursera)',
    issuedDate: '2025-02',
    expiresDate: null,
    credentialStatus: null,
    credentialUrl: null,
    featuredOrder: null,
    publicationStatus: 'published',
  },
  {
    id: 'hugging-face-ai-agents-fundamentals',
    title: 'AI Agents Fundamentals',
    issuer: 'Hugging Face',
    issuedDate: '2025-02',
    expiresDate: null,
    credentialStatus: null,
    credentialUrl: null,
    featuredOrder: null,
    publicationStatus: 'published',
  },
  {
    id: 'nvidia-fundamentals-deep-learning',
    title: 'Fundamentals of Deep Learning',
    issuer: 'NVIDIA',
    issuedDate: '2024-09',
    expiresDate: null,
    credentialStatus: null,
    credentialUrl: null,
    featuredOrder: null,
    publicationStatus: 'published',
  },
  {
    id: 'nvidia-applications-ai-predictive-maintenance',
    title: 'Applications of AI for Predictive Maintenance',
    issuer: 'NVIDIA',
    issuedDate: '2024-07',
    expiresDate: null,
    credentialStatus: null,
    credentialUrl: null,
    featuredOrder: null,
    publicationStatus: 'published',
  },
  {
    id: 'nvidia-building-transformer-based-nlp-applications',
    title: 'Building Transformer-Based NLP Applications',
    issuer: 'NVIDIA',
    issuedDate: '2024-06',
    expiresDate: null,
    credentialStatus: null,
    credentialUrl: null,
    featuredOrder: null,
    publicationStatus: 'published',
  },
]);

export const APPROVED_EDUCATION_CONTRACTS = freezeContract([
  {
    id: 'aivancity-programme-grande-ecole',
    institution: 'Aivancity School for Technology, Business and Society',
    program: 'Programme Grande École',
    startDate: '2024',
    endDate: '2026',
    location: 'Paris, France',
    publicationStatus: 'published',
  },
  {
    id: 'paris-dauphine-psl-mathematics-computer-science',
    institution: 'Paris Dauphine–PSL, Tunis campus',
    program: 'Bachelor’s degree in Mathematics and Computer Science for Decision Making',
    startDate: '2021',
    endDate: '2024',
    location: 'Tunis, Tunisia',
    publicationStatus: 'published',
  },
]);

import { deepFreeze } from './schemas.js';

export const projects = deepFreeze([
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
    image: null,
    featuredOrder: 1,
    publicationStatus: 'published',
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
    image: null,
    featuredOrder: 2,
    publicationStatus: 'published',
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
    image: null,
    featuredOrder: 3,
    fairnessAuditMode: 'user-triggered',
    evaluationStatus: {
      learningEffectiveness: 'not-evaluated',
      fairnessOutcomes: 'not-evaluated',
    },
    publicationStatus: 'published',
  },
]);

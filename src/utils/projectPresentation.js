const CATEGORY_LABELS = Object.freeze({
  'agentic-ai': 'Agentic AI',
  mcp: 'MCP',
  rag: 'Retrieval-augmented generation',
  'applied-research': 'Applied AI research',
  'responsible-ai': 'Responsible AI',
  'computer-vision': 'Computer vision',
  'production-ai': 'Production AI engineering',
  'data-systems': 'Data systems',
});

export function getProjectCategoryLabel(category) {
  const label = CATEGORY_LABELS[category];
  if (!label) throw new Error(`Unsupported project category: ${category}`);
  return label;
}

export function getProjectWorkModeLabel(workMode) {
  if (workMode === 'individual') return 'Individual work by Ahmed';
  if (workMode === 'team') return 'Team work with Ahmed’s contribution stated below';
  throw new Error(`Unsupported project work mode: ${workMode}`);
}

export function getProjectArtifactLinks(project) {
  return [
    project.repositoryUrl
      ? { href: project.repositoryUrl, label: 'View public repository' }
      : null,
    project.demoPaperUrl
      ? { href: project.demoPaperUrl, label: 'View public artifact' }
      : null,
  ].filter(Boolean);
}

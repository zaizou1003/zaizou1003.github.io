import { hydrateRoot } from 'react-dom/client';
import { ProjectsExplorer } from '../components/portfolio-projects/ProjectsExplorer.jsx';
import { projects } from '../data/projects.js';
import { selectPublishedProjects } from '../data/selectors.js';
import { getAvailableProjectCategories } from '../utils/projectFilters.js';

export function hydrateProjectsExplorer() {
  const containers = document.querySelectorAll('[data-hydrate-projects]');
  if (containers.length !== 1) {
    throw new Error(`Expected one Projects hydration container; received ${containers.length}.`);
  }

  const [container] = containers;
  const publishedProjects = selectPublishedProjects(projects);
  const availableCategories = getAvailableProjectCategories(publishedProjects);

  function markHydrated() {
    if (container.dataset.hydrationStatus === 'error') return false;
    container.dataset.hydrationStatus = 'complete';
    return true;
  }

  hydrateRoot(
    container,
    <ProjectsExplorer
      availableCategories={availableCategories}
      onHydrated={markHydrated}
      projects={publishedProjects}
    />,
    {
      onRecoverableError(error) {
        container.dataset.hydrationStatus = 'error';
        console.error('Projects hydration recoverable error:', error);
      },
    },
  );
}

import { renderToString } from 'react-dom/server';
import { HomePage } from '../pages/HomePage.jsx';
import { ProjectsPage } from '../pages/ProjectsPage.jsx';

const pageRenderers = Object.freeze({
  home: () => <HomePage />,
  projects: () => <ProjectsPage />,
});

export function renderPage(pageId) {
  const createPage = pageRenderers[pageId];

  if (!createPage) {
    throw new Error(`Unknown page identifier: ${pageId}`);
  }

  return renderToString(createPage());
}

import { SiteShell } from '../components/layout/SiteShell.jsx';
import { ProjectsExplorer } from '../components/portfolio-projects/ProjectsExplorer.jsx';
import { LinkButton } from '../components/ui/LinkButton.jsx';
import { SectionHeading } from '../components/ui/SectionHeading.jsx';
import { profile } from '../data/profile.js';
import { projects } from '../data/projects.js';
import { selectPublishedProjects } from '../data/selectors.js';
import { getAvailableProjectCategories } from '../utils/projectFilters.js';

export function ProjectsPage() {
  const publishedProjects = selectPublishedProjects(projects);
  const availableCategories = getAvailableProjectCategories(publishedProjects);

  return (
    <SiteShell currentPage="projects" pageId="projects" profile={profile}>
      <section className="page-intro container" aria-labelledby="projects-title">
        <SectionHeading as="h1" eyebrow={profile.name} id="projects-title" title="Projects" />
        <p className="page-intro__summary">
          Evidence-led case studies covering agentic systems, applied AI research and responsible
          production engineering, with implementation roles and evaluation limits made explicit.
        </p>
        <p className="page-actions">
          <LinkButton href="/" variant="secondary">
            Home
          </LinkButton>
        </p>
      </section>
      <div
        className="container"
        data-hydrate-projects=""
        data-hydration-status="static"
      >
        <ProjectsExplorer
          availableCategories={availableCategories}
          projects={publishedProjects}
        />
      </div>
    </SiteShell>
  );
}

import { SiteShell } from '../components/layout/SiteShell.jsx';
import { LinkButton } from '../components/ui/LinkButton.jsx';
import { SectionHeading } from '../components/ui/SectionHeading.jsx';
import { profile } from '../data/profile.js';

export function ProjectsPage() {
  return (
    <SiteShell currentPage="projects" pageId="projects" profile={profile}>
      <section
        className="page-intro container"
        aria-labelledby="projects-title"
        data-projects-placeholder=""
      >
        <SectionHeading as="h1" eyebrow={profile.name} id="projects-title" title="Projects" />
        <p className="page-intro__summary">
          This page retains its reviewed static shell. Published project articles and filtering are
          intentionally deferred to the next milestone.
        </p>
        <p className="page-actions">
          <LinkButton href="/" variant="secondary">
            Home
          </LinkButton>
        </p>
      </section>
    </SiteShell>
  );
}

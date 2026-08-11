import { SiteShell } from '../components/layout/SiteShell.jsx';

export function ProjectsPage() {
  return (
    <SiteShell currentPage="projects" pageId="projects">
      <section className="page-intro container" aria-labelledby="projects-title">
        <p className="eyebrow">Ahmed Aziz Ben Aissa</p>
        <h1 id="projects-title">Projects</h1>
        <p>
          <a href="/">Return to Home</a>
        </p>
      </section>
    </SiteShell>
  );
}

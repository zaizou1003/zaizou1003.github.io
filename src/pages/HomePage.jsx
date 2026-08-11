import { SiteShell } from '../components/layout/SiteShell.jsx';
import { LinkButton } from '../components/ui/LinkButton.jsx';
import { SectionHeading } from '../components/ui/SectionHeading.jsx';
import { profile } from '../data/profile.js';

export function HomePage() {
  return (
    <SiteShell currentPage="home" pageId="home">
      <section className="hero container" aria-labelledby="home-title">
        <SectionHeading as="h1" eyebrow={profile.role} id="home-title" title={profile.name} />
        <p className="page-actions">
          <LinkButton href="/projects/">All projects</LinkButton>
        </p>
      </section>
    </SiteShell>
  );
}

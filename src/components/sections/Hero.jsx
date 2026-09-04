import { LinkButton } from '../ui/LinkButton.jsx';
import { SectionHeading } from '../ui/SectionHeading.jsx';

export function Hero({ profile }) {
  return (
    <section className="hero container" aria-labelledby="home-title" data-home-section="hero">
      <SectionHeading as="h1" eyebrow={profile.role} id="home-title" title={profile.name} />
      <p className="hero__value-proposition">{profile.valueProposition}</p>
      <p className="hero__summary">{profile.summary}</p>
      <div className="page-actions" aria-label="Homepage actions">
        <LinkButton href="#featured-projects">View flagship projects</LinkButton>
        <LinkButton href="/projects/" variant="secondary">
          Explore all projects
        </LinkButton>
      </div>
    </section>
  );
}

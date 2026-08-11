import { SiteShell } from '../components/layout/SiteShell.jsx';

export function HomePage() {
  return (
    <SiteShell currentPage="home" pageId="home">
      <section className="hero container" aria-labelledby="home-title">
        <p className="eyebrow">AI Systems Engineer</p>
        <h1 id="home-title">Ahmed Aziz Ben Aissa</h1>
        <p>
          <a className="button-link" href="/projects/">
            View Projects
          </a>
        </p>
      </section>
    </SiteShell>
  );
}

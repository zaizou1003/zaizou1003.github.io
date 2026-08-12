import { LinkButton } from '../ui/LinkButton.jsx';
import { TagList } from '../ui/TagList.jsx';

function workModeLabel(workMode) {
  if (workMode === 'individual') return 'Individual work by Ahmed';
  if (workMode === 'team') return 'Team work with Ahmed’s contribution stated below';
  throw new Error(`Unsupported project work mode: ${workMode}`);
}

export function FeaturedProjectCard({ project }) {
  const homepageEvidence = project.evidenceResults.slice(0, 3);
  const artifactLinks = [
    project.repositoryUrl
      ? { href: project.repositoryUrl, label: 'View public repository' }
      : null,
    project.demoPaperUrl
      ? { href: project.demoPaperUrl, label: 'View public artifact' }
      : null,
  ].filter(Boolean);

  return (
    <article
      className="featured-project-card surface"
      id={project.id}
      data-featured-project-id={project.id}
      data-featured-order={project.featuredOrder}
      data-work-mode={project.workMode}
    >
      <div className="featured-project-card__header">
        <p className="card-order">Flagship {String(project.featuredOrder).padStart(2, '0')}</p>
        <h3>{project.title}</h3>
        <p className="work-mode-label">{workModeLabel(project.workMode)}</p>
      </div>
      <div className="featured-project-card__layout">
        <div className="flow">
          <div>
            <h4>Problem and system approach</h4>
            <p className="featured-project-card__summary">{project.summary}</p>
          </div>
          <div>
            <h4>Implementation context</h4>
            {project.detailedDescription.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <dl className="project-role">
            <dt>Ahmed’s role</dt>
            <dd>{project.role}</dd>
            <dt>Work status</dt>
            <dd>{workModeLabel(project.workMode)}</dd>
          </dl>
        </div>
        <div className="project-evidence">
          <h4>Verified evidence</h4>
          <ul className="evidence-result-list" data-project-evidence="">
            {homepageEvidence.map((evidence) => (
              <li key={evidence.label}>
                <p className="evidence-result__value">
                  <strong>{evidence.label}:</strong> {evidence.value}
                </p>
                <p className="evidence-result__method">
                  <span>Method:</span> {evidence.method}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="featured-project-card__footer">
        <TagList items={project.technologies} label={`${project.title} technologies`} />
        {artifactLinks.length > 0 ? (
          <div className="artifact-links" data-project-artifacts="">
            {artifactLinks.map((link) => (
              <LinkButton href={link.href} icon="external" key={link.href} variant="secondary">
                {link.label}
              </LinkButton>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

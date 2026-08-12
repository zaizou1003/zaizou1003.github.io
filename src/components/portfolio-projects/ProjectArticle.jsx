import { LinkButton } from '../ui/LinkButton.jsx';
import { TagList } from '../ui/TagList.jsx';
import {
  getProjectArtifactLinks,
  getProjectCategoryLabel,
  getProjectWorkModeLabel,
} from '../../utils/projectPresentation.js';
import styles from './ProjectArticle.module.css';

export function ProjectArticle({ project }) {
  const artifactLinks = getProjectArtifactLinks(project);
  const categoryLabels = project.categories.map(getProjectCategoryLabel);

  return (
    <article
      className={styles.article}
      id={project.id}
      data-project-article-id={project.id}
      data-work-mode={project.workMode}
    >
      <header className={styles.header}>
        <p className={styles.eyebrow}>Published case study</p>
        <h3>
          <a className={styles.titleLink} href={`#${project.id}`}>
            {project.title}
          </a>
        </h3>
        <p className={styles.workMode}>{getProjectWorkModeLabel(project.workMode)}</p>
      </header>

      <div className={styles.layout}>
        <div className={styles.narrative}>
          <section aria-labelledby={`${project.id}-summary`}>
            <h4 id={`${project.id}-summary`}>Problem and system approach</h4>
            <p className={styles.summary}>{project.summary}</p>
          </section>

          <section aria-labelledby={`${project.id}-context`}>
            <h4 id={`${project.id}-context`}>Implementation context and limits</h4>
            {project.detailedDescription.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>

          <dl className={styles.metadata}>
            <dt>Ahmed’s role</dt>
            <dd>{project.role}</dd>
            <dt>Work status</dt>
            <dd>{getProjectWorkModeLabel(project.workMode)}</dd>
          </dl>
        </div>

        <section className={styles.evidence} aria-labelledby={`${project.id}-evidence`}>
          <h4 id={`${project.id}-evidence`}>Verified evidence</h4>
          <ul className={styles.evidenceList} data-project-evidence="">
            {project.evidenceResults.map((evidence) => (
              <li key={evidence.label}>
                <p className={styles.evidenceValue}>
                  <strong>{evidence.label}:</strong> {evidence.value}
                </p>
                <p className={styles.evidenceMethod}>
                  <span>Method:</span> {evidence.method}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <footer className={styles.footer}>
        <div className={styles.taxonomy}>
          <div>
            <h4>Technologies</h4>
            <TagList items={project.technologies} label={`${project.title} technologies`} />
          </div>
          <div>
            <h4>Areas</h4>
            <TagList items={categoryLabels} label={`${project.title} areas`} />
          </div>
        </div>
        {artifactLinks.length > 0 ? (
          <div className={styles.artifacts} data-project-artifacts="">
            {artifactLinks.map((link) => (
              <LinkButton href={link.href} icon="external" key={link.href} variant="secondary">
                {link.label}
              </LinkButton>
            ))}
          </div>
        ) : null}
      </footer>
    </article>
  );
}

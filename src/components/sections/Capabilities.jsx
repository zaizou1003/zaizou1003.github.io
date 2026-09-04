import { SectionHeading } from '../ui/SectionHeading.jsx';

export function Capabilities({ capabilities, projects }) {
  const projectIndex = new Map(projects.map((project) => [project.id, project]));

  return (
    <section
      className="section section--surface"
      id="capabilities"
      aria-labelledby="capabilities-title"
      data-home-section="capabilities"
    >
      <div className="container">
        <SectionHeading
          id="capabilities-title"
          eyebrow="System capabilities"
          title="AI systems, organized by evidence"
          description="Four capability groups connect the engineering focus directly to reviewed project evidence."
        />
        <ol className="card-grid capability-grid">
          {capabilities.map((capability) => (
            <li key={capability.id}>
              <article className="content-card capability-card" data-capability-id={capability.id}>
                <p className="card-order" aria-hidden="true">
                  {String(capability.displayOrder).padStart(2, '0')}
                </p>
                <h3>{capability.title}</h3>
                <p>{capability.description}</p>
                <p className="evidence-label">Project evidence</p>
                <ul className="evidence-link-list">
                  {capability.evidenceProjectIds.map((projectId) => {
                    const project = projectIndex.get(projectId);
                    if (!project) throw new Error(`Missing capability evidence project: ${projectId}`);
                    return (
                      <li key={projectId}>
                        <a href={`#${projectId}`}>{project.title}</a>
                      </li>
                    );
                  })}
                </ul>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

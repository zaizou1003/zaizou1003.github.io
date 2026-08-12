import { FeaturedProjectCard } from '../portfolio-projects/FeaturedProjectCard.jsx';
import { SectionHeading } from '../ui/SectionHeading.jsx';

export function FeaturedProjects({ projects }) {
  return (
    <section
      className="section"
      id="featured-projects"
      aria-labelledby="featured-projects-title"
      data-home-section="featured-projects"
    >
      <div className="container">
        <SectionHeading
          id="featured-projects-title"
          eyebrow="Flagship evidence"
          title="Three systems, with roles and limits made explicit"
          description="Each case summary separates implementation scope, personal contribution and the evidence available for public review."
        />
        <ol className="featured-project-list">
          {projects.map((project) => (
            <li key={project.id}>
              <FeaturedProjectCard project={project} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

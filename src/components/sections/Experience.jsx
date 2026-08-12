import { ExperienceItem } from '../experience/ExperienceItem.jsx';
import { SectionHeading } from '../ui/SectionHeading.jsx';

export function Experience({ experiences }) {
  return (
    <section
      className="section section--surface"
      id="experience"
      aria-labelledby="experience-title"
      data-home-section="experience"
    >
      <div className="container">
        <SectionHeading
          id="experience-title"
          eyebrow="Professional experience"
          title="AI engineering in enterprise and production contexts"
          description="Public descriptions stay at an approved scope and do not imply access to employer code or private systems."
        />
        <ol className="experience-list">
          {experiences.map((experience) => (
            <li key={experience.id}>
              <ExperienceItem experience={experience} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

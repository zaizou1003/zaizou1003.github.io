import { SkillGroup } from '../content/SkillGroup.jsx';
import { SectionHeading } from '../ui/SectionHeading.jsx';

export function Skills({ groups }) {
  return (
    <section
      className="section section--surface"
      id="skills"
      aria-labelledby="skills-title"
      data-home-section="skills"
    >
      <div className="container">
        <SectionHeading
          id="skills-title"
          eyebrow="Technical toolkit"
          title="Skills grouped by system function"
          description="Displayed skills resolve to published project or professional evidence; proficiency scores are intentionally omitted."
        />
        <ul className="card-grid skill-grid">
          {groups.map((group) => (
            <li key={group.id}>
              <SkillGroup group={group} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

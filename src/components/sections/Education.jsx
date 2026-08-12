import { EducationItem } from '../content/EducationItem.jsx';
import { SectionHeading } from '../ui/SectionHeading.jsx';

export function Education({ education }) {
  return (
    <section
      className="section section--surface"
      id="education"
      aria-labelledby="education-title"
      data-home-section="education"
    >
      <div className="container">
        <SectionHeading
          id="education-title"
          eyebrow="Education"
          title="Mathematics, computer science and AI systems"
          description="Only approved institution, programme, location and date facts are shown."
        />
        <ol className="card-grid education-grid">
          {education.map((record) => (
            <li key={record.id}>
              <EducationItem education={record} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

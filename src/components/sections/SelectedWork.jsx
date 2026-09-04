import { SectionHeading } from '../ui/SectionHeading.jsx';

export function SelectedWork({ projects }) {
  if (projects.length !== 0) {
    throw new Error('Milestone 4 has no approved supporting project records.');
  }

  return (
    <section
      className="section"
      id="selected-work"
      aria-labelledby="selected-work-title"
      data-home-section="selected-work"
    >
      <div className="container">
        <SectionHeading
          id="selected-work-title"
          eyebrow="Selected technical work"
          title="Publication follows evidence review"
        />
        <p className="selected-work-state" data-selected-work-state="evidence-review">
          Only evidence-reviewed work is published here; additional technical case studies remain under
          validation.
        </p>
      </div>
    </section>
  );
}

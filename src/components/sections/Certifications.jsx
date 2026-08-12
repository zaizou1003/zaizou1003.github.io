import { CertificationCard } from '../content/CertificationCard.jsx';
import { SectionHeading } from '../ui/SectionHeading.jsx';

export function Certifications({ certifications }) {
  return (
    <section
      className="section"
      id="certifications"
      aria-labelledby="certifications-title"
      data-home-section="certifications"
    >
      <div className="container">
        <SectionHeading
          id="certifications-title"
          eyebrow="Certifications"
          title="Current learning and platform credentials"
          description="Credentials are text-first and omit images, identifiers and unstable verification links."
        />
        <ol className="card-grid certification-grid">
          {certifications.map((certification) => (
            <li key={certification.id}>
              <CertificationCard certification={certification} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

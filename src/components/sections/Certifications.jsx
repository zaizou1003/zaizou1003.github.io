import { CertificationCard } from '../content/CertificationCard.jsx';
import { SectionHeading } from '../ui/SectionHeading.jsx';

export function Certifications({ featuredCertifications, remainingCertifications }) {
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
          title="Verified learning and platform credentials"
          description="Three high-signal credentials are featured first, with additional certifications across AI, data science, deep learning and cybersecurity available below."
        />
        <ol
          className="card-grid certification-grid"
          data-certification-list="featured"
        >
          {featuredCertifications.map((certification, index) => (
            <li key={certification.id}>
              <CertificationCard
                certification={certification}
                displayPosition={index + 1}
              />
            </li>
          ))}
        </ol>
        <details className="certification-disclosure" data-certification-disclosure>
          <summary className="certification-disclosure__summary">
            View all certifications ({remainingCertifications.length} more)
          </summary>
          <ol
            className="card-grid certification-grid certification-grid--remaining"
            data-certification-list="remaining"
            start={featuredCertifications.length + 1}
          >
            {remainingCertifications.map((certification, index) => (
              <li key={certification.id}>
                <CertificationCard
                  certification={certification}
                  displayPosition={featuredCertifications.length + index + 1}
                />
              </li>
            ))}
          </ol>
        </details>
      </div>
    </section>
  );
}

import { formatMonthRange } from '../../utils/dates.js';
import { TagList } from '../ui/TagList.jsx';

const EMPLOYMENT_LABELS = Object.freeze({
  apprenticeship: 'Apprenticeship',
  internship: 'Internship',
  employment: 'Employment',
});

export function ExperienceItem({ experience }) {
  const employmentLabel = EMPLOYMENT_LABELS[experience.employmentType];
  if (!employmentLabel) throw new Error(`Unsupported employment type: ${experience.employmentType}`);

  return (
    <article className="experience-item surface" data-experience-id={experience.id}>
      <div className="experience-item__heading">
        <div>
          <p className="eyebrow">{employmentLabel}</p>
          <h3>{experience.employer}</h3>
          <p className="experience-item__role">{experience.roleTitle}</p>
        </div>
        <p className="experience-item__dates">
          <span>{formatMonthRange(experience.startDate, experience.endDate)}</span>
          {experience.location ? <span>{experience.location}</span> : null}
        </p>
      </div>
      <p className="reading-width">{experience.summary}</p>
      <ul className="experience-highlights">
        {experience.highlights.map((highlight) => (
          <li key={highlight}>{highlight}</li>
        ))}
      </ul>
      <TagList items={experience.technologies} label={`${experience.employer} technologies`} />
      {experience.confidentialityNote ? (
        <p className="confidentiality-note">{experience.confidentialityNote}</p>
      ) : null}
    </article>
  );
}

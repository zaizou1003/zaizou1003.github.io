import { formatYearRange } from '../../utils/dates.js';

export function EducationItem({ education }) {
  return (
    <article className="content-card education-item" data-education-id={education.id}>
      <p className="education-item__dates">{formatYearRange(education.startDate, education.endDate)}</p>
      <h3>{education.institution}</h3>
      <p>{education.program}</p>
      <p className="education-item__location">{education.location}</p>
    </article>
  );
}

import { formatMonthYear } from '../../utils/dates.js';
import { LinkButton } from '../ui/LinkButton.jsx';

export function CertificationCard({ certification }) {
  return (
    <article className="content-card certification-card" data-certification-id={certification.id}>
      <p className="card-order">Credential {String(certification.featuredOrder).padStart(2, '0')}</p>
      <p className="certification-card__issuer">{certification.issuer}</p>
      <h3>{certification.title}</h3>
      <p className="certification-card__dates">
        Issued {formatMonthYear(certification.issuedDate)}
        {certification.expiresDate
          ? ` · Expires ${formatMonthYear(certification.expiresDate)}`
          : ''}
      </p>
      {certification.credentialUrl ? (
        <LinkButton href={certification.credentialUrl} icon="external" variant="secondary">
          Verify credential
        </LinkButton>
      ) : null}
    </article>
  );
}

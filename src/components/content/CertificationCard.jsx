import { formatMonthYear } from '../../utils/dates.js';
import { LinkButton } from '../ui/LinkButton.jsx';

export function CertificationCard({ certification, displayPosition }) {
  return (
    <article className="content-card certification-card" data-certification-id={certification.id}>
      <p className="card-order">Credential {String(displayPosition).padStart(2, '0')}</p>
      <p className="certification-card__issuer">{certification.issuer}</p>
      <h3>{certification.title}</h3>
      <p className="certification-card__dates">
        Issued {formatMonthYear(certification.issuedDate)}
        {certification.credentialStatus === 'active'
          ? ` · Expires ${formatMonthYear(certification.expiresDate)}`
          : null}
        {certification.credentialStatus === 'expired'
          ? ` · Expired ${formatMonthYear(certification.expiresDate)}`
          : null}
      </p>
      {certification.credentialUrl ? (
        <LinkButton href={certification.credentialUrl} icon="external" variant="secondary">
          Verify credential
        </LinkButton>
      ) : null}
    </article>
  );
}

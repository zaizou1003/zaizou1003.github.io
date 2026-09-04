const supportedHeadings = new Set(['h1', 'h2', 'h3']);

export function SectionHeading({ as = 'h2', description, eyebrow, id, title }) {
  if (!supportedHeadings.has(as)) {
    throw new Error(`Unsupported section heading level: ${as}`);
  }

  const Heading = as;

  return (
    <div className="section-heading">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <Heading id={id}>{title}</Heading>
      {description ? <p className="section-heading__description">{description}</p> : null}
    </div>
  );
}

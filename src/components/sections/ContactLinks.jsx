import { InlineIcon } from '../ui/InlineIcon.jsx';
import { SectionHeading } from '../ui/SectionHeading.jsx';

const CONTACT_ORDER = Object.freeze(['email', 'linkedin', 'github']);

export function ContactLinks({ links }) {
  return (
    <section
      className="section"
      id="contact"
      aria-labelledby="contact-title"
      data-home-section="contact"
    >
      <div className="container contact-layout">
        <SectionHeading
          id="contact-title"
          eyebrow="Contact"
          title="Start a direct conversation"
          description="Use one of the three direct public links below. This site does not collect form data or track contact activity."
        />
        <address className="home-contact">
          <ul className="home-contact-list" data-home-contact-list="">
            {CONTACT_ORDER.map((kind) => {
              const link = links[kind];
              if (!link) throw new Error(`Missing approved contact link: ${kind}`);
              return (
                <li key={kind}>
                  <a
                    className="home-contact-link"
                    href={link.href}
                    data-home-contact-kind={link.kind}
                  >
                    <InlineIcon name={link.kind} />
                    <span>{link.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </address>
      </div>
    </section>
  );
}

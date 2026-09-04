import { InlineIcon } from '../ui/InlineIcon.jsx';
import { NavigationMenu } from './NavigationMenu.jsx';

function SkipLink() {
  return (
    <a className="skip-link" href="#main">
      Skip to main content
    </a>
  );
}

function SiteHeader({ currentPage, profile }) {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <a
          className="site-identity"
          href="/"
          aria-label={`${profile.name}, home`}
          aria-current={currentPage === 'home' ? 'page' : undefined}
        >
          <span className="site-identity__name">{profile.name}</span>
          <span className="site-identity__role">{profile.role}</span>
        </a>
        <div
          data-hydrate-navigation=""
          data-current-page={currentPage}
          data-hydration-status="static"
        >
          <NavigationMenu currentPage={currentPage} />
        </div>
      </div>
    </header>
  );
}

function SiteFooter({ currentPage, profile }) {
  const contactLinks = Object.values(profile.links);

  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <p className="site-footer__identity">
          <strong>{profile.name}</strong>
          <span>{profile.role}</span>
        </p>
        <div>
          <p className="site-footer__label">Pages</p>
          <nav aria-label="Footer">
            <ul className="footer-nav">
              <li>
                <a href="/" aria-current={currentPage === 'home' ? 'page' : undefined}>
                  Home
                </a>
              </li>
              <li>
                <a
                  href="/projects/"
                  aria-current={currentPage === 'projects' ? 'page' : undefined}
                >
                  Projects
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <div className="site-footer__contact-block">
          <p className="site-footer__label">Contact</p>
          <address className="footer-contact">
            <ul className="footer-contact-list" data-footer-contacts="">
              {contactLinks.map((link) => (
                <li key={link.kind}>
                  <a
                    className="footer-contact-link"
                    href={link.href}
                    data-contact-kind={link.kind}
                  >
                    <InlineIcon name={link.kind} />
                    <span>{link.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </address>
        </div>
      </div>
    </footer>
  );
}

export function SiteShell({ children, currentPage, pageId, profile }) {
  return (
    <>
      <SkipLink />
      <SiteHeader currentPage={currentPage} profile={profile} />
      <main id="main" className="page-main" data-static-page={pageId} tabIndex="-1">
        {children}
      </main>
      <SiteFooter currentPage={currentPage} profile={profile} />
    </>
  );
}

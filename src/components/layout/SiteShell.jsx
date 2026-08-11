import { NavigationMenu } from './NavigationMenu.jsx';

function SkipLink() {
  return (
    <a className="skip-link" href="#main">
      Skip to main content
    </a>
  );
}

function SiteHeader({ currentPage }) {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <a className="site-identity" href="/" aria-label="Ahmed Aziz Ben Aissa, home">
          <span className="site-identity__name">Ahmed Aziz Ben Aissa</span>
          <span className="site-identity__role">AI Systems Engineer</span>
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

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <p>
          <strong>Ahmed Aziz Ben Aissa</strong>
          <span>AI Systems Engineer</span>
        </p>
        <nav aria-label="Footer">
          <ul className="footer-nav">
            <li>
              <a href="/">Home</a>
            </li>
            <li>
              <a href="/projects/">Projects</a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

export function SiteShell({ children, currentPage, pageId }) {
  return (
    <>
      <SkipLink />
      <SiteHeader currentPage={currentPage} />
      <main id="main" className="page-main" data-static-page={pageId} tabIndex="-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}

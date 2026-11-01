import { Link, NavLink } from 'react-router-dom';
import { PageTransition, ScrollProgress } from '../motion';
import { site } from '../site.config.js';

export default function Layout({ children }) {
  return (
    <>
      <ScrollProgress className="progress" />
      <a className="skip" href="#main">Skip to content</a>
      <header className="site-header">
        <Link to="/" className="brand" aria-label={site.name + ' home'}>
          <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="3" fill="#14120f" /><rect x="7" y="21" width="4" height="5" fill="#fbfaf7" /><rect x="14" y="14" width="4" height="12" fill="#fbfaf7" /><rect x="21" y="7" width="4" height="19" fill="#0b6e4f" /></svg>
          ValueForge
        </Link>
        <nav aria-label="Main"><NavLink to="/projects">Projects</NavLink></nav>
      </header>
      <main id="main"><PageTransition>{children}</PageTransition></main>
      <footer className="site-footer">
        <span>ValueForge. Rule-based analysis of your own interview notes.</span>
        <nav aria-label="Legal">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          {site.repoUrl ? <a href={site.repoUrl} rel="noreferrer">Source</a> : null}
        </nav>
      </footer>
    </>
  );
}

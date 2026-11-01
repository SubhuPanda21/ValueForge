import { Link } from 'react-router-dom';
import { InView, TextEffect } from '../motion';
import { site } from '../site.config.js';

const Contact = () => (
  <p>{site.contactEmail ? <>Questions or deletion requests: <a href={'mailto:' + site.contactEmail}>{site.contactEmail}</a>.</> : 'Questions or deletion requests: open an issue on the project repository, or contact the person who operates this deployment.'}</p>
);

export function Privacy() {
  return (
    <article className="legal">
      <TextEffect as="h1" per="word" preset="blur">Privacy policy</TextEffect>
      <p className="muted">Last updated {site.updated}</p>
      <InView>
        <h2>What this service stores</h2>
        <ul>
          <li>Projects you create: the name, audience, product idea, ROI inputs, and the interview notes you type or paste. This is needed to analyse them and to bring them back when you return.</li>
          <li>A random identifier created in your browser (localStorage key <code>valueforge_client</code>). It is sent with your requests so you can see only your own projects. It is not linked to your name or email.</li>
        </ul>
        <h2>What it does not do</h2>
        <ul>
          <li>No accounts, no cookies, no analytics, no advertising and no third party scripts or fonts.</li>
          <li>Your notes are analysed on this server with fixed rules. They are not sent to any language model or outside service.</li>
          <li>Your IP address is held in memory briefly for rate limiting and is not written to the database.</li>
        </ul>
        <h2>Interview notes about other people</h2>
        <p>Interview notes may describe real people. Only enter notes you have the right to store, and avoid names, contact details and other personal data. Use roles such as "maintenance engineer" as labels.</p>
        <h2>Access</h2>
        <p>Projects are private to the browser that created them. There are no public links. Anyone who can use your browser profile, or who has access to the server database, can read them.</p>
        <h2>Retention and deletion</h2>
        <p>A project is deleted automatically {site.retentionDays} days after it was last changed. You can delete a project or an interview at any time from the app. Provider backups may persist briefly.</p>
        <h2>Exports</h2>
        <p>PDF and Markdown briefs are generated on request and are not stored.</p>
        <h2>Contact</h2>
        <Contact />
      </InView>
    </article>
  );
}

export function Terms() {
  return (
    <article className="legal">
      <TextEffect as="h1" per="word" preset="blur">Terms of use</TextEffect>
      <p className="muted">Last updated {site.updated}</p>
      <InView>
        <h2>The service</h2>
        <p>{site.name} analyses interview notes you provide and produces rankings, estimates and drafts. It is provided as is, without warranty.</p>
        <h2>Estimates are not decisions</h2>
        <p>Rankings and payback figures come from the notes you enter and from stated assumptions. Small samples can mislead. Treat the output as hypotheses to test with more customers, not as proof of demand.</p>
        <h2>Your content</h2>
        <p>You keep ownership of everything you enter. You allow the service to store and process it for the retention period so it can provide the analysis. You are responsible for having the right to enter it.</p>
        <h2>Acceptable use</h2>
        <ul>
          <li>Do not enter unlawful content or personal data you have no right to process.</li>
          <li>Do not probe, overload or attack the service, or bypass its rate limits.</li>
        </ul>
        <h2>Availability and changes</h2>
        <p>The service may be limited, changed or stopped at any time. Projects may be removed at the end of the retention period.</p>
        <h2>Liability</h2>
        <p>To the extent the law allows, the operator is not liable for losses arising from use of the service or reliance on its output.</p>
        <h2>Contact</h2>
        <Contact />
        <p>See also the <Link to="/privacy">privacy policy</Link>.</p>
      </InView>
    </article>
  );
}

export function NotFound() {
  return (
    <div className="page">
      <TextEffect as="h1" per="word" preset="blur">Page not found</TextEffect>
      <p><Link to="/">Back to the start</Link></p>
    </div>
  );
}

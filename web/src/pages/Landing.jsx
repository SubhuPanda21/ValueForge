import { Link } from 'react-router-dom';
import { AnimatedGroup, InView, TextEffect } from '../motion';

const IN = [
  'Interview notes as plain text, one block per person',
  'A label for each person, such as their role',
  'One sentence describing your product idea',
  'Optional: team size, hourly cost and build cost',
];
const OUT = [
  'Problems ranked by reach, intensity and quantified cost',
  'Verbatim quotes behind every problem',
  'Time costs pulled from the notes, with assumed frequencies flagged',
  'A value statement that names the alternatives people use today',
  'A payback chart and a brief as PDF or Markdown',
  'Questions to ask in the next round of interviews',
];

export default function Landing() {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">For founders, product managers and interns doing discovery</p>
        <TextEffect as="h1" per="word" preset="fade-in-blur" className="display">Turn customer interviews into a ranked list of problems worth solving.</TextEffect>
        <InView delay={0.3}>
          <p className="lead">Paste your interview notes. ValueForge finds the pains people repeat, pulls out the time they say it costs, ranks the problems by how many people raised them, and drafts a value statement and payback estimate you can back with quotes.</p>
        </InView>
        <InView delay={0.45} className="cta-row">
          <Link className="btn" to="/projects">Start a project</Link>
          <Link className="link" to="/projects?sample=1">Open the sample project</Link>
        </InView>
      </section>

      <section className="sec two">
        <InView><h2>What goes in</h2><ul className="plain">{IN.map((t) => <li key={t}>{t}</li>)}</ul></InView>
        <InView delay={0.1}><h2>What comes out</h2><ul className="plain">{OUT.map((t) => <li key={t}>{t}</li>)}</ul></InView>
      </section>

      <section className="sec">
        <InView><h2>How the ranking works</h2></InView>
        <AnimatedGroup className="rows" itemClassName="row-item" stagger={0.08}>
          <div><span className="k">40%</span><div><h3>Reach</h3><p>The share of interviewees who raised the problem. Something five people mention beats something one person mentions loudly.</p></div></div>
          <div><span className="k">30%</span><div><h3>Intensity</h3><p>How strongly it is described: words like hate, always, biggest problem, and how many of the sentences on the topic are complaints.</p></div></div>
          <div><span className="k">30%</span><div><h3>Quantified cost</h3><p>Minutes per person per month, read from statements such as "40 minutes per report, 6 reports a week". Elapsed waiting time is kept apart from labour time.</p></div></div>
        </AnimatedGroup>
        <InView><p className="muted">No language model is used for scoring. The rules are fixed, and every quote shown is copied word for word from your notes, so you can trace any number back to a sentence.</p></InView>
      </section>

      <section className="sec two">
        <InView><h2>Limits</h2></InView>
        <InView delay={0.1}>
          <ul className="plain">
            <li>Under five interviews, the ranking is a set of hypotheses. The app says so.</li>
            <li>Notes should be in English. Sarcasm and indirect phrasing can be misread.</li>
            <li>When a frequency is taken from a nearby sentence, it is marked as assumed.</li>
            <li>The payback estimate only uses the numbers you give it. With no hourly cost, it shows hours, not money.</li>
          </ul>
        </InView>
      </section>

      <section className="sec">
        <InView>
          <h2>Bring your next set of interviews.</h2>
          <Link className="btn" to="/projects">Start a project</Link>
        </InView>
      </section>
    </>
  );
}

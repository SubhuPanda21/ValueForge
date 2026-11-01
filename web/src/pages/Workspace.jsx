import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, clientId, send } from '../api.js';
import { AnimatedGroup, AnimatedNumber, InView, TextEffect } from '../motion';
import { PayChart } from '../components/PayChart.jsx';

const CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED'];
const hours = (m) => Math.round((m / 60) * 10) / 10;

export default function Workspace() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState('');
  const timers = useRef({});
  const [open, setOpen] = useState(null);

  useEffect(() => { api('/projects/' + id).then(setData).catch((e) => setErr(e.message)); }, [id]);
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  // Edits show immediately. Saving is debounced, and only the analysis is taken from the reply so typing is never overwritten.
  const schedule = useCallback((key, fn) => {
    clearTimeout(timers.current[key]);
    setSaving('Saving');
    timers.current[key] = setTimeout(async () => {
      try { const r = await fn(); setData((d) => (d ? { ...d, analysis: r.analysis } : d)); setSaving('Saved'); } catch (e) { setErr(e.message); setSaving(''); }
    }, 650);
  }, []);

  if (err && !data) return <div className="page"><p className="alert" role="alert">{err}</p><Link to="/projects">Back to projects</Link></div>;
  if (!data) return <div className="page"><p className="muted">Loading</p></div>;
  const { project, interviews, analysis: a } = data;

  const editProject = (patch) => { setData((d) => ({ ...d, project: { ...d.project, ...patch } })); schedule('project', () => send('PATCH', '/projects/' + id, patch)); };
  const editRoi = (patch) => {
    const roi = { ...project.roi, ...patch };
    setData((d) => ({ ...d, project: { ...d.project, roi } }));
    schedule('roi', () => send('PATCH', '/projects/' + id, { roi }));
  };
  const editInterview = (iid, patch) => {
    setData((d) => ({ ...d, interviews: d.interviews.map((i) => (i.id === iid ? { ...i, ...patch } : i)) }));
    schedule('iv' + iid, () => send('PATCH', '/projects/' + id + '/interviews/' + iid, patch));
  };
  const addInterview = async () => { try { const r = await send('POST', '/projects/' + id + '/interviews', { label: '', notes: '' }); setData(r); } catch (e) { setErr(e.message); } };
  const removeInterview = async (iid) => { if (!window.confirm('Delete this interview?')) return; try { setData(await send('DELETE', '/projects/' + id + '/interviews/' + iid)); } catch (e) { setErr(e.message); } };
  const removeProject = async () => { if (!window.confirm('Delete this whole project?')) return; await send('DELETE', '/projects/' + id); nav('/projects'); };

  const r = a.roi;
  const money = (n) => new Intl.NumberFormat(undefined, { style: 'currency', currency: r.inputs.currency, maximumFractionDigits: 0 }).format(n);
  const download = async (kind) => {
    try {
      const res = await fetch('/api/projects/' + id + '/brief.' + kind, { headers: { 'x-client-id': clientId() } });
      if (!res.ok) throw new Error('Could not create the brief');
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement('a'); link.href = url; link.download = 'valueforge-brief.' + kind; link.click(); URL.revokeObjectURL(url);
    } catch (e) { setErr(e.message); }
  };

  return (
    <div className="page wide">
      <div className="ws-head">
        <div>
          <TextEffect as="h1" per="word" preset="blur">{project.name}</TextEffect>
          {project.isSample ? <p className="badge-line"><span className="badge">sample data</span> These interviews were written for this app so you can see the analysis. Replace them with your own.</p> : null}
        </div>
        <span className="status" aria-live="polite">{saving}</span>
      </div>
      {err ? <p className="alert" role="alert">{err}</p> : null}

      <div className="ws-grid">
        <div className="ws-left">
          <section aria-labelledby="h-brief">
            <h2 id="h-brief">1. The idea</h2>
            <label htmlFor="aud">Who is it for?</label>
            <input id="aud" value={project.audience} onChange={(e) => editProject({ audience: e.target.value })} placeholder="maintenance teams that write inspection reports" maxLength={200} />
            <label htmlFor="prod">Product name (optional)</label>
            <input id="prod" value={project.product} onChange={(e) => editProject({ product: e.target.value })} placeholder="the product" maxLength={60} />
            <label htmlFor="idea">What does it do? Start with a verb.</label>
            <textarea id="idea" data-lenis-prevent rows={3} value={project.idea} onChange={(e) => editProject({ idea: e.target.value })} placeholder="turns photos and readings from a site visit into a finished report" maxLength={600} />
          </section>

          <section aria-labelledby="h-iv">
            <h2 id="h-iv">2. Interviews</h2>
            <p className="muted small">One block per person. Plain notes or a transcript. Lines starting with "Q:" or "Interviewer:" are ignored. Avoid names and contact details.</p>
            {interviews.map((iv, i) => (
              <div className="iv" key={iv.id}>
                <div className="iv-top">
                  <label htmlFor={'l' + iv.id} className="sr">Label for interview {i + 1}</label>
                  <input id={'l' + iv.id} className="iv-label" value={iv.label} onChange={(e) => editInterview(iv.id, { label: e.target.value })} placeholder={'Role, e.g. Respondent ' + (i + 1)} maxLength={80} />
                  <button className="link danger" onClick={() => removeInterview(iv.id)}>Delete</button>
                </div>
                <label htmlFor={'n' + iv.id} className="sr">Notes for interview {i + 1}</label>
                <textarea id={'n' + iv.id} data-lenis-prevent rows={7} value={iv.notes} onChange={(e) => editInterview(iv.id, { notes: e.target.value })} placeholder="Paste notes here" maxLength={20000} />
              </div>
            ))}
            <button className="btn alt" onClick={addInterview}>Add interview</button>
          </section>

          <section aria-labelledby="h-roi">
            <h2 id="h-roi">3. Payback inputs</h2>
            <div className="roi-grid">
              <div><label htmlFor="users">People affected</label><input id="users" type="number" min="1" value={project.roi.users ?? 1} onChange={(e) => editRoi({ users: Number(e.target.value) })} /></div>
              <div><label htmlFor="rate">Cost per hour</label><input id="rate" type="number" min="0" value={project.roi.hourlyRate ?? 0} onChange={(e) => editRoi({ hourlyRate: Number(e.target.value) })} /></div>
              <div><label htmlFor="build">Cost to build</label><input id="build" type="number" min="0" value={project.roi.buildCost ?? 0} onChange={(e) => editRoi({ buildCost: Number(e.target.value) })} /></div>
              <div><label htmlFor="cur">Currency</label><select id="cur" value={project.roi.currency || 'USD'} onChange={(e) => editRoi({ currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div className="full"><label htmlFor="red">Share of the time you expect to save: {project.roi.reductionPct ?? 50}%</label><input id="red" type="range" min="0" max="100" value={project.roi.reductionPct ?? 50} onChange={(e) => editRoi({ reductionPct: Number(e.target.value) })} /></div>
              <div className="full"><label htmlFor="ov">Minutes lost per person per month (leave empty to use the interviews: {a.observedMinutesPerPersonMonth ? Math.round(a.observedMinutesPerPersonMonth) : 'none found'})</label>
                <input id="ov" type="number" min="0" value={project.roi.minutesOverride ?? ''} onChange={(e) => editRoi({ minutesOverride: e.target.value === '' ? null : Number(e.target.value) })} /></div>
            </div>
          </section>

          <section><button className="link danger" onClick={removeProject}>Delete this project</button></section>
        </div>

        <aside className="ws-right" aria-label="Live analysis">
          <h2>Analysis</h2>
          <p className="muted small">{a.interviewCount} interview{a.interviewCount === 1 ? '' : 's'}, {a.sentenceCount} sentences read, {a.quantifiedCount} time cost{a.quantifiedCount === 1 ? '' : 's'} found. Updates as you type.</p>
          {a.warnings.map((w) => <p className="warn" key={w}>{w}</p>)}

          {a.themes.length ? (
            <AnimatedGroup className="themes" itemClassName="theme-item" stagger={0.06}>
              {a.themes.map((t, i) => (
                <article className="theme" key={t.id}>
                  <button className="theme-head" aria-expanded={open === t.id} onClick={() => setOpen(open === t.id ? null : t.id)}>
                    <span className="rank">{i + 1}</span>
                    <span className="theme-main"><strong>{t.label}</strong><span className="muted small">{t.evidence}{t.minutesPerPersonMonth ? '. ' + hours(t.minutesPerPersonMonth) + ' h per person per month' : ''}</span></span>
                    <span className="score-num">{t.score}</span>
                  </button>
                  <div className="bar" aria-hidden="true"><div className="bar-fill" style={{ width: t.score + '%' }} /></div>
                  {open === t.id ? (
                    <div className="theme-body">
                      {t.quotes.map((q) => <blockquote key={q.text}>{q.text}<cite>{q.who}</cite></blockquote>)}
                      <p className="small muted">Reach {t.reachCount} of {a.interviewCount}. Intensity {Math.round(t.intensity * 100)} of 100. Terms: {t.keywords.join(', ') || 'none'}.</p>
                    </div>
                  ) : null}
                </article>
              ))}
            </AnimatedGroup>
          ) : <p className="muted">Themes appear here once your notes mention problems such as manual work, errors, delays or missing visibility.</p>}

          {a.story ? (
            <InView>
              <h3>Value statement</h3>
              <p className="statement">{a.story.statement}</p>
              <p className="muted small">{a.story.problem}</p>
              {a.alternatives.length ? <p className="small">Alternatives seen in the notes: {a.alternatives.map((x) => x.name + ' (' + x.count + ')').join(', ')}.</p> : null}
              <h3>Ask next</h3>
              <ul className="plain small">{a.story.nextQuestions.map((q) => <li key={q.theme}><strong>{q.theme}.</strong> {q.question}</li>)}</ul>
            </InView>
          ) : null}

          <h3>Payback</h3>
          <div className="stats">
            <div><span>Time lost per person</span><strong><AnimatedNumber value={hours(r.minutesPerPersonMonth)} decimals={1} /> h / month</strong></div>
            <div><span>Monthly saving</span><strong>{r.inputs.hourlyRate > 0 ? money(r.savings) : 'add a cost per hour'}</strong></div>
            <div><span>Payback</span><strong>{r.payback ? (Math.round(r.payback * 10) / 10) + ' months' : r.inputs.buildCost > 0 && r.savings <= 0 ? 'no saving yet' : 'add a build cost'}</strong></div>
            <div><span>First year, net</span><strong>{r.inputs.hourlyRate > 0 && r.inputs.buildCost > 0 ? money(r.yearNet) : 'not set'}</strong></div>
          </div>
          {r.savings > 0 ? <PayChart series={r.series} payback={r.payback} money={money} /> : null}
          <p className="muted small">Based on {r.source === 'override' ? 'the minutes you entered' : 'the average of what interviewees said'} and an assumed {r.inputs.reductionPct}% reduction.</p>

          <h3>Take it with you</h3>
          <div className="cta-row"><button className="btn" onClick={() => download('pdf')}>Download PDF</button><button className="btn alt" onClick={() => download('md')}>Download Markdown</button></div>
        </aside>
      </div>
    </div>
  );
}

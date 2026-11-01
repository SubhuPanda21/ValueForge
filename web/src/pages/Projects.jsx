import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, send } from '../api.js';
import { AnimatedGroup, InView, TextEffect } from '../motion';

export default function Projects() {
  const [rows, setRows] = useState(null);
  const [name, setName] = useState('');
  const [audience, setAudience] = useState('');
  const [err, setErr] = useState('');
  const [params] = useSearchParams();
  const nav = useNavigate();
  const sampling = useRef(false);

  const load = () => api('/projects').then(setRows).catch((e) => setErr(e.message));
  useEffect(() => {
    if (params.get('sample') && !sampling.current) {
      sampling.current = true;
      send('POST', '/projects/sample').then((r) => nav('/p/' + r.id, { replace: true })).catch((e) => { setErr(e.message); load(); });
    } else load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async (e) => {
    e.preventDefault(); setErr('');
    try { const r = await send('POST', '/projects', { name, audience }); nav('/p/' + r.id); } catch (x) { setErr(x.message); }
  };
  const remove = async (id, n) => {
    if (!window.confirm('Delete "' + n + '" and all its interviews?')) return;
    try { await send('DELETE', '/projects/' + id); load(); } catch (x) { setErr(x.message); }
  };

  return (
    <div className="page">
      <TextEffect as="h1" per="word" preset="blur">Projects</TextEffect>
      <p className="muted">Stored on this server and tied to a random ID in this browser. Nothing is shared.</p>
      {err ? <p className="alert" role="alert">{err}</p> : null}

      <InView>
        <form className="newproj" onSubmit={create}>
          <h2>New project</h2>
          <label htmlFor="pname">Name</label>
          <input id="pname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Warehouse picking, round 1" maxLength={80} required />
          <label htmlFor="paud">Who are you building for?</label>
          <input id="paud" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="warehouse supervisors at mid-size distributors" maxLength={200} />
          <div className="cta-row"><button className="btn" type="submit">Create project</button>
            <button className="link" type="button" onClick={() => send('POST', '/projects/sample').then((r) => nav('/p/' + r.id)).catch((x) => setErr(x.message))}>Or load the sample project</button></div>
        </form>
      </InView>

      {rows && rows.length ? (
        <>
          <h2 className="spaced">Your projects</h2>
          <AnimatedGroup className="plist" itemClassName="plist-item" stagger={0.05}>
            {rows.map((p) => (
              <div className="prow" key={p.id}>
                <div>
                  <Link to={'/p/' + p.id}><strong>{p.name}</strong></Link>
                  {p.isSample ? <span className="badge">sample data</span> : null}
                  <div className="muted small">{p.interviewCount} interview{p.interviewCount === 1 ? '' : 's'}. Updated {new Date(p.updatedAt).toLocaleDateString()}</div>
                </div>
                <button className="link danger" onClick={() => remove(p.id, p.name)}>Delete</button>
              </div>
            ))}
          </AnimatedGroup>
        </>
      ) : null}
    </div>
  );
}

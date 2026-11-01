// ValueForge analysis engine. Rule-based and fully traceable: every number points back to a sentence you wrote.
// No language model is involved in scoring.

export const PER_MONTH = { day: 22, week: 4.33, month: 1 };

export const THEMES = [
  { id: 'manual', label: 'Manual, repetitive work', re: /\b(manual(ly)?|copy(ing)?[- ](and[- ])?past\w*|retyp\w*|re-?enter\w*|by hand|spreadsheet\w*|excel|repetitive|again and again|over and over|every single time|same (details|information)|tedious|template)\b/i,
    question: 'Walk me through the last time you did this from start to finish. Which steps did you repeat?' },
  { id: 'errors', label: 'Errors and rework', re: /\b(mistake\w*|errors?|wrong|typed wrong|typos?|incorrect|redo|re-?do|rework\w*|repeat visit|fix(ing)?|missed|miss|forgot|inconsisten\w*)\b/i,
    question: 'What was the last mistake that got through, and what did it cost to put right?' },
  { id: 'delay', label: 'Waiting and delays', re: /\b(wait(ing)?|delay\w*|slow|backlog|turnaround|bottleneck|late|chasing|takes? (a )?(long|forever|ages|days|weeks)|days? after)\b/i,
    question: 'Where does the work sit idle, and who is waiting on it when it does?' },
  { id: 'visibility', label: 'No visibility or tracking', re: /\b(no (way|idea|visibility)|can'?t (see|tell|track|find|compare)|cannot (see|tell|track|find|compare)|where (is|are)|status|tracking|lost|scattered|different (places|tools|folders)|hard to find|history|no visibility)\b/i,
    question: 'How do you find out where something stands today? Who do you ask?' },
  { id: 'cost', label: 'Cost and waste', re: /\b(cost\w*|expens\w*|budget|overtime|penalt\w*|fines?|downtime|wast\w*|lost (money|revenue|sales))\b/i,
    question: 'Can you put a rough number on what this costs per month, in time or money?' },
  { id: 'tools', label: 'Tools that do not connect', re: /\b(integrat\w*|doesn'?t (talk|connect|sync)|different (system|tool|software)|multiple (system|tool)s?|export\w*|import\w*|legacy|portal|sync\w*|whatsapp|photos? on (my|the) phone)\b/i,
    question: 'Which tools do you switch between for this job, and what do you carry across by hand?' },
  { id: 'risk', label: 'Compliance and safety risk', re: /\b(complian\w*|audits?|regulat\w*|safety|risk\w*|liabil\w*|certif\w*|legal|incident\w*|safety checks?)\b/i,
    question: 'What happens if this goes wrong during an audit or an incident?' },
  { id: 'skill', label: 'Training and knowledge gaps', re: /\b(train\w*|new (hires?|joiners?)|onboard\w*|knowledge|only (one|person)|retire\w*|don'?t know how|learn\w*|consisten(cy|t) )\b/i,
    question: 'How does a new person learn to do this, and how long until they are reliable?' },
];

const PAIN = /\b(hate|annoy\w*|frustrat\w*|painful|nightmare|terrible|ridiculous|waste\w*|struggl\w*|hard|difficult|problem\w*|issue\w*|biggest|worst|always|never|every time|too (long|much|many)|can'?t|cannot|don'?t have|no way|stuck|tedious|tiring|stress\w*|complain\w*|late|chasing)\b/gi;

const STOP = new Set('a an the and or but if then so of to in on at for with from by as is are was were be been it its this that these those i we you they he she my our your their me us them do does did have has had not no yes can could would should will just very really also than too about into over out up down more most some any all each every one two three get got going go like because when what which who how there here again day days week weeks month hours hour minutes time times take takes took need needs want makes make made still even only other another around'.split(' '));

const ALTERNATIVES = [
  ['Spreadsheets', /\b(spreadsheets?|excel|google sheets?)\b/i],
  ['Email', /\b(e-?mail|inbox)\b/i],
  ['WhatsApp or chat apps', /\b(whatsapp|telegram|slack|teams chat)\b/i],
  ['Paper or notebooks', /\b(paper|notebook|clipboard|handwritten|pen)\b/i],
  ['Word documents', /\b(word doc\w*|word file|ms word|\bword\b)\b/i],
  ['Shared folders', /\b(folders?|shared drive|sharepoint|dropbox|google drive)\b/i],
  ['An ERP or legacy system', /\b(erp|sap|legacy|oracle)\b/i],
  ['Phone calls', /\b(phone calls?|calling|call them)\b/i],
];

const NUMW = { another: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, 'half an': 0.5, 'half a': 0.5 };
const NUM = '(\\d+(?:\\.\\d+)?|half an|half a|another|an|one|two|three|four|five|six|seven|eight|nine|ten|twelve)';
const toNum = (s) => (/^\d/.test(s) ? parseFloat(s) : NUMW[s] ?? 1);
const unitMinutes = (u) => (/^(hours?|hrs?|hr)$/.test(u) ? 60 : 1);

/* ---------- text handling ---------- */
export function splitSentences(text) {
  const out = [];
  String(text || '').replace(/\r/g, '').split('\n').forEach((raw) => {
    let line = raw.trim().replace(/^[-*•]\s+/, '');
    if (!line) return;
    if (/^(q|question|interviewer|int|me)\s*[:\-]/i.test(line)) return;
    line = line.replace(/^(a|answer|respondent|resp|them)\s*[:\-]\s*/i, '');
    line.split(/(?<=[.!?])\s+(?=[A-Z"'(“])/).forEach((p) => {
      const s = p.trim();
      if (s.split(/\s+/).length >= 3) out.push(s);
    });
  });
  return out;
}

export function parseQuantities(sentence) {
  let s = ' ' + sentence.toLowerCase() + ' ';
  const out = [];
  s = s.replace(new RegExp(NUM + '\\s*(minutes?|mins?|hours?|hrs?|hr)\\s*(?:a|per|every|each|\\/)\\s*(day|week|month)', 'g'), (m, n, u, per) => {
    const minutes = toNum(n) * unitMinutes(u);
    out.push({ kind: 'labor', minutes, count: 1, period: per, monthly: minutes * PER_MONTH[per] });
    return ' ';
  });
  const durs = [];
  s = s.replace(new RegExp(NUM + '\\s*(minutes?|mins?|hours?|hrs?|hr|days?|weeks?)\\b', 'g'), (m, n, u) => {
    const v = toNum(n);
    if (/^(days?|weeks?)$/.test(u)) durs.push({ kind: 'elapsed', days: /^weeks?$/.test(u) ? v * 7 : v });
    else durs.push({ kind: 'labor', minutes: v * unitMinutes(u) });
    return ' ';
  });
  let freq = null;
  let m = /(\d+(?:\.\d+)?)\s*(?:[a-z-]+\s+){0,2}?(?:a|per|each|every)\s+(day|week|month)\b/.exec(s);
  if (m) freq = { count: parseFloat(m[1]), period: m[2] };
  if (!freq && (m = /\b(once|twice|thrice)\s+(?:a|per|every)\s+(day|week|month)\b/.exec(s))) freq = { count: { once: 1, twice: 2, thrice: 3 }[m[1]], period: m[2] };
  if (!freq && /\b(every day|daily|each day)\b/.test(s)) freq = { count: 1, period: 'day' };
  if (!freq && /\b(weekly|every week|each week)\b/.test(s)) freq = { count: 1, period: 'week' };
  if (!freq && /\b(monthly|every month|each month)\b/.test(s)) freq = { count: 1, period: 'month' };
  durs.forEach((d) => {
    if (d.kind === 'elapsed') out.push(d);
    else if (freq) out.push({ kind: 'labor', minutes: d.minutes, count: freq.count, period: freq.period, monthly: d.minutes * freq.count * PER_MONTH[freq.period] });
    else out.push({ kind: 'labor', minutes: d.minutes, monthly: null, needsFreq: true });
  });
  if (freq && !durs.length && !out.length) out.push({ kind: 'freq', count: freq.count, period: freq.period });
  return out;
}

const tokens = (s) => (s.toLowerCase().match(/[a-z][a-z'-]{2,}/g) || []).filter((w) => !STOP.has(w));
const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));

/* ---------- ROI ---------- */
export function computeRoi(roi, observedMinutes) {
  const r = { users: 1, hourlyRate: 0, buildCost: 0, reductionPct: 50, minutesOverride: null, currency: 'USD', ...(roi || {}) };
  const minutes = r.minutesOverride != null && r.minutesOverride !== '' ? Number(r.minutesOverride) : (observedMinutes || 0);
  const hoursNow = (r.users * minutes) / 60;
  const costNow = hoursNow * r.hourlyRate;
  const hoursSaved = hoursNow * (r.reductionPct / 100);
  const savings = hoursSaved * r.hourlyRate;
  const payback = savings > 0 && r.buildCost > 0 ? r.buildCost / savings : null;
  const series = Array.from({ length: 25 }, (_, m) => ({ month: m, net: Math.round(savings * m - r.buildCost) }));
  return { inputs: r, minutesPerPersonMonth: minutes, source: r.minutesOverride != null && r.minutesOverride !== '' ? 'override' : 'interviews', hoursNow, costNow, hoursSaved, savings, payback, yearNet: savings * 12 - r.buildCost, series };
}

/* ---------- the analysis ---------- */
export function analyze(project, interviews) {
  const N = interviews.length;
  const docs = interviews.map((iv, idx) => {
    const sentences = splitSentences(iv.notes);
    const who = (iv.label && iv.label.trim()) || 'Respondent ' + (idx + 1);
    const themed = sentences.map((s) => THEMES.filter((t) => t.re.test(s)).map((t) => t.id));
    const quantsRaw = sentences.map((s) => parseQuantities(s));
    // Fill missing frequencies from the two sentences either side.
    quantsRaw.forEach((qs, i) => qs.forEach((q) => {
      if (q.needsFreq) {
        for (let d = 1; d <= 2 && q.monthly == null; d++) {
          for (const j of [i - d, i + d]) {
            const f = quantsRaw[j] && quantsRaw[j].find((x) => x.kind === 'freq');
            if (f) { q.count = f.count; q.period = f.period; q.monthly = q.minutes * f.count * PER_MONTH[f.period]; q.assumed = true; break; }
          }
        }
        delete q.needsFreq;
      }
    }));
    return { who, sentences, themed, quants: quantsRaw };
  });

  const allSentences = docs.flatMap((d) => d.sentences);
  const df = new Map();
  allSentences.forEach((s) => new Set(tokens(s)).forEach((w) => df.set(w, (df.get(w) || 0) + 1)));

  const quantities = [];
  docs.forEach((d) => d.quants.forEach((qs, i) => qs.forEach((q) => {
    if (q.kind === 'freq') return;
    quantities.push({ who: d.who, text: d.sentences[i], kind: q.kind, minutes: q.minutes ?? null, days: q.days ?? null, count: q.count ?? null, period: q.period ?? null, monthly: q.monthly ?? null, assumed: !!q.assumed, _doc: d, _i: i });
  })));

  const perDocMonthly = docs.map((d) => quantities.filter((q) => q._doc === d && q.kind === 'labor' && q.monthly != null).reduce((a, q) => a + q.monthly, 0));
  const withNumbers = perDocMonthly.filter((v) => v > 0);
  const observed = withNumbers.length ? withNumbers.reduce((a, b) => a + b, 0) / withNumbers.length : null;

  const raw = THEMES.map((t) => {
    const hits = []; const whoSet = new Set();
    docs.forEach((d, di) => d.sentences.forEach((s, i) => {
      if (d.themed[i].includes(t.id)) {
        PAIN.lastIndex = 0;
        const pain = (s.match(PAIN) || []).length;
        const q = d.quants[i].some((x) => x.kind !== 'freq') || (d.quants[i - 1] || []).some((x) => x.kind === 'labor' && x.monthly != null) ? 1 : 0;
        hits.push({ s, who: d.who, di, i, pain, q });
        whoSet.add(di);
      }
    }));
    if (!hits.length) return null;
    const painful = hits.filter((h) => h.pain > 0).length;
    const avgInt = hits.reduce((a, h) => a + Math.min(3, h.pain), 0) / hits.length / 3;
    const intensity = clamp((painful / hits.length) * 0.6 + avgInt * 0.4);
    // Quantified minutes per person: sum labor quantities that sit on a sentence in this theme (or an adjacent one), per interview.
    const perDoc = [];
    docs.forEach((d, di) => {
      let sum = 0, any = false;
      quantities.forEach((q) => {
        if (q._doc !== d || q.kind !== 'labor' || q.monthly == null) return;
        const near = [q._i, q._i - 1, q._i + 1].some((j) => d.themed[j] && d.themed[j].includes(t.id));
        if (near && d.themed[q._i] && d.themed[q._i].includes(t.id)) { sum += q.monthly; any = true; }
        else if (near && !(d.themed[q._i] || []).length) { sum += q.monthly; any = true; }
      });
      if (any) perDoc.push(sum);
    });
    const minutes = perDoc.length ? perDoc.reduce((a, b) => a + b, 0) / perDoc.length : null;
    const themeSentences = hits.map((h) => h.s);
    const tf = new Map(); themeSentences.forEach((s) => tokens(s).forEach((w) => tf.set(w, (tf.get(w) || 0) + 1)));
    const keywords = [...tf.entries()].filter(([w]) => w.length >= 4).map(([w, c]) => [w, c * Math.log(1 + allSentences.length / (df.get(w) || 1))]).sort((a, b) => b[1] - a[1]).slice(0, 6).map((x) => x[0]);
    const seen = new Set();
    const quotes = hits.map((h) => ({ ...h, rank: h.pain * 2 + h.q * 2 + Math.min(h.s.length, 160) / 160 })).sort((a, b) => b.rank - a.rank)
      .filter((h) => { if (seen.has(h.s)) return false; seen.add(h.s); return true; }).slice(0, 3).map((h) => ({ text: h.s, who: h.who }));
    return { id: t.id, label: t.label, question: t.question, reachCount: whoSet.size, reach: whoSet.size / N, mentions: hits.length, intensity, minutesPerPersonMonth: minutes, keywords, quotes };
  }).filter(Boolean);

  const maxMin = Math.max(0, ...raw.map((t) => t.minutesPerPersonMonth || 0));
  const themes = raw.map((t) => {
    const costNorm = maxMin ? (t.minutesPerPersonMonth || 0) / maxMin : 0;
    const score = maxMin ? 0.4 * t.reach + 0.3 * t.intensity + 0.3 * costNorm : 0.55 * t.reach + 0.45 * t.intensity;
    return { ...t, score: Math.round(score * 100), evidence: t.reachCount >= 3 ? 'Raised by ' + t.reachCount + ' people' : t.reachCount === 2 ? 'Raised by 2 people' : 'Single source' };
  }).sort((a, b) => b.score - a.score);

  const alternatives = ALTERNATIVES.map(([name, re]) => ({ name, count: interviews.filter((iv) => re.test(iv.notes || '')).length })).filter((a) => a.count > 0).sort((a, b) => b.count - a.count).slice(0, 4);
  const PHRASE = { 'Spreadsheets': 'spreadsheets', 'Email': 'email', 'WhatsApp or chat apps': 'WhatsApp or chat apps', 'Paper or notebooks': 'paper or notebooks', 'Word documents': 'Word documents', 'Shared folders': 'shared folders', 'An ERP or legacy system': 'an ERP or legacy system', 'Phone calls': 'phone calls' };

  const warnings = [];
  if (N === 0) warnings.push('Add interview notes to start the analysis.');
  else if (N < 5) warnings.push('Only ' + N + ' interview' + (N === 1 ? '' : 's') + '. Treat the ranking as a set of hypotheses to test, not as a finding. Five or more interviews with the same type of person gives a more stable picture.');
  if (N && !quantities.some((q) => q.kind === 'labor' && q.monthly != null)) warnings.push('No time costs were found. Ask each person how long a task takes and how often they do it, so the payback estimate has real inputs.');
  if (themes.some((t) => t.evidence === 'Single source') && N > 1) warnings.push('Some themes come from one person only. They are marked as single source.');
  if (quantities.some((q) => q.assumed)) warnings.push('Some frequencies were taken from a neighbouring sentence. They are marked as assumed. Check them against the notes.');

  let story = null;
  if (themes.length) {
    const top = themes[0];
    const audience = (project.audience || '').trim() || 'the people interviewed';
    const idea = (project.idea || '').trim();
    const altText = alternatives.length ? 'Today they rely on ' + alternatives.map((a) => PHRASE[a.name] || a.name).join(', ') + '.' : '';
    const proof = top.reachCount + ' of ' + N + ' interviewed';
    story = {
      problem: 'For ' + audience + ', the strongest signal is ' + top.label.toLowerCase() + ' (' + proof + ').' + (top.minutesPerPersonMonth ? ' Those who gave numbers lose about ' + Math.round(top.minutesPerPersonMonth / 60 * 10) / 10 + ' hours per person per month to it.' : ''),
      statement: idea ? 'For ' + audience + ' who deal with ' + top.label.toLowerCase() + ', ' + ((project.product || '').trim() || 'the product') + ' ' + idea.replace(/^[A-Z]/, (c) => c.toLowerCase()).replace(/\.$/, '') + '. ' + altText : 'Add one sentence describing your product idea to complete the value statement. The problem evidence is ready above.',
      proofQuote: top.quotes[0] || null,
      alternatives: altText,
      nextQuestions: themes.slice(0, 3).map((t) => ({ theme: t.label, question: t.question })),
    };
  }

  return {
    interviewCount: N, sentenceCount: allSentences.length,
    quantifiedCount: quantities.filter((q) => q.kind === 'labor' && q.monthly != null).length,
    warnings, themes, alternatives, story,
    quantities: quantities.map(({ _doc, _i, ...q }) => q),
    observedMinutesPerPersonMonth: observed,
    roi: computeRoi(project.roi, observed),
  };
}

import PDFDocument from 'pdfkit';

const hours = (m) => Math.round((m / 60) * 10) / 10;
const money = (n, cur) => cur + ' ' + Math.round(n).toLocaleString('en-US');
// The built-in PDF fonts cover Latin text only. Replace anything else so the file never shows broken glyphs.
const clean = (s) => String(s ?? '').replace(/[\u2013\u2014]/g, '-').replace(/[^\x20-\x7E -ÿ‘’“”…]/g, '?');

export function briefMarkdown(project, a) {
  const L = ['# ' + project.name, ''];
  if (project.audience) L.push('**Audience:** ' + project.audience + '  ');
  if (project.idea) L.push('**Idea:** ' + (project.product || 'The product') + ' ' + project.idea + '  ');
  L.push('**Based on:** ' + a.interviewCount + ' interviews, ' + a.sentenceCount + ' sentences, ' + a.quantifiedCount + ' quantified time costs', '');
  a.warnings.forEach((w) => L.push('> ' + w, ''));
  if (a.story) {
    L.push('## Value statement', '', a.story.statement, '', '## Problem evidence', '', a.story.problem, '');
    if (a.story.proofQuote) L.push('> "' + a.story.proofQuote.text + '" (' + a.story.proofQuote.who + ')', '');
  }
  L.push('## Ranked problems', '', '| Rank | Problem | Score | Evidence | Hours per person per month |', '|---|---|---|---|---|');
  a.themes.forEach((t, i) => L.push('| ' + (i + 1) + ' | ' + t.label + ' | ' + t.score + ' | ' + t.evidence + ' | ' + (t.minutesPerPersonMonth ? hours(t.minutesPerPersonMonth) : 'not stated') + ' |'));
  L.push('');
  a.themes.slice(0, 4).forEach((t) => {
    L.push('### ' + t.label, '');
    t.quotes.forEach((q) => L.push('> "' + q.text + '" (' + q.who + ')', ''));
  });
  const r = a.roi;
  L.push('## Payback estimate', '');
  L.push('- People affected: ' + r.inputs.users, '- Time lost per person per month: ' + hours(r.minutesPerPersonMonth) + ' hours (' + (r.source === 'override' ? 'entered by you' : 'average of what interviewees said') + ')');
  L.push('- Assumed reduction: ' + r.inputs.reductionPct + '%');
  if (r.inputs.hourlyRate > 0) {
    L.push('- Hourly cost: ' + money(r.inputs.hourlyRate, r.inputs.currency), '- Monthly cost today: ' + money(r.costNow, r.inputs.currency), '- Monthly saving: ' + money(r.savings, r.inputs.currency));
    if (r.payback) L.push('- Build cost: ' + money(r.inputs.buildCost, r.inputs.currency), '- Payback: ' + (Math.round(r.payback * 10) / 10) + ' months', '- First year net: ' + money(r.yearNet, r.inputs.currency));
  } else L.push('- Add an hourly cost to convert hours into money.');
  L.push('', '## Questions for the next interviews', '');
  if (a.story) a.story.nextQuestions.forEach((q) => L.push('- ' + q.theme + ': ' + q.question));
  L.push('', '---', 'Method: rule-based theme matching, quantity parsing and a weighted score (40% reach, 30% intensity, 30% quantified cost). No language model was used. Every quote is copied verbatim from the interview notes.');
  return L.join('\n');
}

export function briefPdf(project, a, stream) {
  const doc = new PDFDocument({ size: 'A4', margin: 56, info: { Title: clean(project.name), Producer: 'ValueForge' } });
  doc.pipe(stream);
  const W = doc.page.width - 112;
  const H = (t) => { doc.moveDown(0.9).font('Helvetica-Bold').fontSize(13).fillColor('#111').text(clean(t)); doc.moveDown(0.3); };
  const P = (t, o = {}) => doc.font(o.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(o.size || 10.5).fillColor(o.color || '#222').text(clean(t), { width: W, lineGap: 2, ...o.opts });

  doc.font('Helvetica-Bold').fontSize(22).fillColor('#111').text(clean(project.name), { width: W });
  doc.moveDown(0.3);
  if (project.audience) P('Audience: ' + project.audience, { color: '#555' });
  P('Based on ' + a.interviewCount + ' interviews and ' + a.quantifiedCount + ' quantified time costs.', { color: '#555' });
  a.warnings.forEach((w) => { doc.moveDown(0.4); P('Note: ' + w, { color: '#8a3b12', size: 9.5 }); });

  if (a.story) {
    H('Value statement'); P(a.story.statement);
    H('Problem evidence'); P(a.story.problem);
    if (a.story.proofQuote) { doc.moveDown(0.3); P('"' + a.story.proofQuote.text + '" (' + a.story.proofQuote.who + ')', { color: '#444', opts: { indent: 12 } }); }
  }
  H('Ranked problems');
  a.themes.forEach((t, i) => {
    if (doc.y > doc.page.height - 130) doc.addPage();
    P((i + 1) + '. ' + t.label + '   score ' + t.score + '   ' + t.evidence + (t.minutesPerPersonMonth ? '   ' + hours(t.minutesPerPersonMonth) + ' h per person per month' : ''), { bold: true });
    t.quotes.slice(0, 2).forEach((q) => P('"' + q.text + '" (' + q.who + ')', { color: '#555', size: 9.5, opts: { indent: 14 } }));
    doc.moveDown(0.35);
  });
  const r = a.roi;
  if (doc.y > doc.page.height - 200) doc.addPage();
  H('Payback estimate');
  P('People affected: ' + r.inputs.users + '. Time lost per person per month: ' + hours(r.minutesPerPersonMonth) + ' hours (' + (r.source === 'override' ? 'entered by you' : 'average of what interviewees said') + '). Assumed reduction: ' + r.inputs.reductionPct + '%.');
  if (r.inputs.hourlyRate > 0) {
    P('Monthly cost today: ' + money(r.costNow, r.inputs.currency) + '. Monthly saving: ' + money(r.savings, r.inputs.currency) + '.');
    if (r.payback) P('Build cost ' + money(r.inputs.buildCost, r.inputs.currency) + ' pays back in ' + (Math.round(r.payback * 10) / 10) + ' months. First year net: ' + money(r.yearNet, r.inputs.currency) + '.', { bold: true });
  } else P('Add an hourly cost to convert hours into money.');
  if (a.story) {
    H('Questions for the next interviews');
    a.story.nextQuestions.forEach((q) => P(q.theme + ': ' + q.question));
  }
  doc.moveDown(1);
  P('Method: rule-based theme matching, quantity parsing and a weighted score (40% reach, 30% intensity, 30% quantified cost). No language model was used. Quotes are copied verbatim from the interview notes.', { color: '#777', size: 8.5 });
  doc.end();
}

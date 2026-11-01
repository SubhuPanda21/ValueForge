import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, parseQuantities, splitSentences, computeRoi, PER_MONTH } from '../server/analysis.js';
import { SAMPLE } from '../server/sample.js';

const close = (a, b, eps = 0.5) => assert.ok(Math.abs(a - b) <= eps, a + ' vs ' + b);

test('splitSentences drops interviewer lines and speaker prefixes', () => {
  const s = splitSentences('Q: How long does it take?\nA: It takes about 40 minutes. Then I redo it.\n- Another point here.');
  assert.deepEqual(s, ['It takes about 40 minutes.', 'Then I redo it.', 'Another point here.']);
});

test('parseQuantities: duration per period', () => {
  const q = parseQuantities('I spend 2 hours a week chasing technicians.');
  assert.equal(q.length, 1);
  assert.equal(q[0].minutes, 120);
  close(q[0].monthly, 120 * PER_MONTH.week);
});

test('parseQuantities: duration plus separate frequency in one sentence', () => {
  const q = parseQuantities('It is about 15 minutes per visit and I do 4 visits a day.');
  assert.equal(q[0].kind, 'labor');
  assert.equal(q[0].monthly, 15 * 4 * PER_MONTH.day);
});

test('parseQuantities: elapsed time is not counted as labor', () => {
  const q = parseQuantities('The turnaround is usually 3 days after the visit.');
  assert.equal(q[0].kind, 'elapsed');
  assert.equal(q[0].days, 3);
});

test('parseQuantities: word numbers and half hours', () => {
  assert.equal(parseQuantities('It takes half an hour every day.')[0].monthly, 30 * PER_MONTH.day);
  assert.equal(parseQuantities('I wait two days for approval.')[0].days, 2);
});

test('sample project: themes, reach and quantified cost', () => {
  const a = analyze({ audience: SAMPLE.audience, idea: SAMPLE.idea, roi: {} }, SAMPLE.interviews);
  assert.equal(a.interviewCount, 4);
  const ids = a.themes.map((t) => t.id);
  for (const id of ['manual', 'errors', 'delay', 'visibility', 'risk']) assert.ok(ids.includes(id), 'missing theme ' + id);
  assert.ok(a.themes[0].score >= a.themes[1].score);
  const manual = a.themes.find((t) => t.id === 'manual');
  assert.ok(manual.reachCount >= 2);
  assert.ok(manual.quotes.length > 0);
  // 6 reports a week at 40 minutes, with the frequency taken from the neighbouring sentence
  const q = a.quantities.find((x) => x.minutes === 40);
  assert.ok(q && q.assumed);
  close(q.monthly, 40 * 6 * PER_MONTH.week);
  assert.ok(a.observedMinutesPerPersonMonth > 500);
  assert.ok(a.warnings.some((w) => /Only 4 interviews/.test(w)));
  assert.ok(a.story.statement.includes(SAMPLE.audience));
  assert.ok(a.alternatives.length > 0);
});

test('every quote comes verbatim from the notes', () => {
  const a = analyze({ roi: {} }, SAMPLE.interviews);
  const all = SAMPLE.interviews.map((i) => i.notes).join('\n');
  a.themes.forEach((t) => t.quotes.forEach((q) => assert.ok(all.includes(q.text), q.text)));
});

test('empty and tiny inputs do not crash', () => {
  const e = analyze({ roi: {} }, []);
  assert.equal(e.themes.length, 0);
  assert.equal(e.story, null);
  const one = analyze({ roi: {} }, [{ label: '', notes: 'Fine.' }]);
  assert.equal(one.themes.length, 0);
});

test('roi maths', () => {
  const r = computeRoi({ users: 10, hourlyRate: 20, buildCost: 5000, reductionPct: 50 }, 600);
  assert.equal(r.hoursNow, 100);
  assert.equal(r.costNow, 2000);
  assert.equal(r.savings, 1000);
  assert.equal(r.payback, 5);
  assert.equal(r.yearNet, 7000);
  assert.equal(r.series[5].net, 0);
  const none = computeRoi({ users: 10 }, null);
  assert.equal(none.payback, null);
});

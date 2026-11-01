/** Cumulative net saving over 24 months. The line crosses zero at the payback point. */
export function PayChart({ series, payback, money }) {
  const W = 520, H = 220, P = { l: 12, r: 12, t: 16, b: 28 };
  const ys = series.map((s) => s.net);
  const lo = Math.min(0, ...ys), hi = Math.max(0, ...ys);
  const X = (m) => P.l + (m / 24) * (W - P.l - P.r);
  const Y = (v) => P.t + (1 - (v - lo) / (hi - lo || 1)) * (H - P.t - P.b);
  const d = series.map((s, i) => (i ? 'L' : 'M') + X(s.month).toFixed(1) + ' ' + Y(s.net).toFixed(1)).join(' ');
  const last = series[series.length - 1];
  return (
    <figure className="pay">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={'Cumulative net saving over 24 months, ending at ' + money(last.net) + (payback && payback <= 24 ? '. Break-even at month ' + (Math.round(payback * 10) / 10) : '. No break-even within 24 months')}>
        <line x1={P.l} x2={W - P.r} y1={Y(0)} y2={Y(0)} stroke="#14120f" strokeWidth="1" />
        <path d={d} fill="none" stroke="#0b6e4f" strokeWidth="2.5" pathLength="1" className="draw" />
        {payback && payback <= 24 ? <g><line x1={X(payback)} x2={X(payback)} y1={P.t} y2={H - P.b} stroke="#8a867d" strokeDasharray="3 4" /><circle cx={X(payback)} cy={Y(0)} r="4.5" fill="#0b6e4f" /><text x={X(payback) + 8} y={P.t + 12} fontSize="12" fill="#14120f">break-even, month {Math.round(payback * 10) / 10}</text></g> : null}
        {[0, 6, 12, 18, 24].map((m) => <text key={m} x={X(m)} y={H - 8} fontSize="11" textAnchor="middle" fill="#6b675f">{m}</text>)}
        <text x={W - P.r} y={Y(last.net) - 8} fontSize="12" textAnchor="end" fill="#14120f">{money(last.net)}</text>
      </svg>
      <figcaption className="muted small">Months from launch</figcaption>
    </figure>
  );
}

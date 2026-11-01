# ValueForge

Turn customer interview notes into a prioritised problem brief with a payback estimate. It extracts themes, pain intensity and quantified costs (like "40 minutes" or "6 reports a week") from the notes themselves and exports a PDF or Markdown brief.

## How it works

- **Analysis:** rule-based NLP with no LLM. A theme lexicon, pain-word intensity, a quantity parser for durations and frequencies, and TF-IDF keywords. Every quote shown is verbatim from your notes.
- **Score:** 40% reach, 30% intensity, 30% quantified cost (55/45 reach and intensity when no cost is stated).
- **ROI:** payback model from the stated time costs, with assumed frequencies flagged, and small-sample warnings.
- **Output:** autosaved projects, PDF (pdfkit) and Markdown brief. Four labelled sample interviews included.
- **Style:** minimalist UI.

## Honest limits

Rules and lexicons miss phrasing they do not know. Eight interviews is a signal, not a statistic, and the app says so. ROI is only as good as the numbers people gave you.

## Resume bullets (edit to taste)

- Built ValueForge, a full-stack customer-discovery tool (Node, Express, React, SQLite) that converts interview notes into ranked problems and a payback model with PDF export.
- Wrote a deterministic NLP pipeline (theme lexicon, quantity and duration parser, TF-IDF) so every claim traces to a verbatim quote; 13 automated tests.

## Interview talking points

- Why deterministic and quote-grounded beats an LLM summary for discovery work.
- How the quantity parser handles "another hour each time" and elapsed time.
- How the score weights change when no cost is mentioned, and why.

## Run locally

Requires Node 22.13 or newer (it uses the built-in `node:sqlite`).

```bash
npm install
npm run dev      # API on :3000, Vite on :5173 (open the Vite URL)
npm test         # node --test
npm run build && npm start   # production, serves everything on :3000
```

## Deploy

Any host that runs a Node web service or a Dockerfile works (Render, Railway, Fly.io, a VPS).

- Build command: `npm install && npm run build`. Start command: `npm start`. Or use the included `Dockerfile`.
- Attach a **persistent disk** and point `DATA_DIR` at it (the Dockerfile uses `/data`). Without it, data is lost on each deploy.
- Set `TRUST_PROXY=1` behind a platform proxy so the rate limiter sees real client IPs.
- Put your contact email in `web/src/site.config.js` so the privacy and terms pages show it.

## Privacy model

No accounts and no cookies. Each browser gets a random ID stored in localStorage and sent as a header. Data is scoped to that ID and deleted automatically after the retention period shown in the app. Requests are rate limited and a strict Content-Security-Policy is set.

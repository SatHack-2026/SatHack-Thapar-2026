"use client";

import { useState, type ReactNode } from "react";

/* ---------- data contract (see backend fields needed at the bottom of the chat reply) ---------- */
export interface SourceLink { name: string; url: string }
export interface ClaimReport { sourceName: string; reportedValueOrPosition: string; sourceUrl: string }
export interface DifferingClaim { claim: string; reports: ClaimReport[]; status: string }
export interface CoverageGap { question: string; explanation?: string }
export interface StoryContext {
  secondPerspective: { headline: string; summary: string; sourceName: string; sourceUrl: string } | null;
  coverageGaps: CoverageGap[];
  differingClaims: DifferingClaim[];
  contextSummary: string;
  contextSources: SourceLink[];
  analysisStatus: "available" | "pending" | "unavailable";
  isSampleData: boolean;
}
export interface ContextArticle {
  id: string;
  sourceName: string;
  publishedAt: string;
  category: string;
  title: string;
  excerpt: string;
  url: string;
  visual: 0 | 1 | 2;
  context: StoryContext;
}

/* ---------- SAMPLE DATA (clearly labelled in the UI) ---------- */
const SAMPLE_URL = "https://example.com";
export const ARTICLES: ContextArticle[] = [
  {
    id: "transit",
    sourceName: "Daily Ledger",
    publishedAt: "21 Nov 2026",
    category: "City",
    title: "Council clears 12-route bus expansion after heated session",
    excerpt: "A five-year, $40 million plan passed 7–5 after hours of public comment on fares and routes.",
    url: SAMPLE_URL,
    visual: 0,
    context: {
      secondPerspective: {
        headline: "Transit agency says projected ridership gains offset the cost",
        summary:
          "The agency's filing projects 18,000 new daily riders by year three and says fare revenue would cover about a third of operating costs.",
        sourceName: "Metro Wire",
        sourceUrl: SAMPLE_URL,
      },
      coverageGaps: [
        { question: "How was the $40 million figure calculated?", explanation: "The article reports the total but not its breakdown." },
        { question: "Is funding for new stations included in that total?" },
      ],
      differingClaims: [
        {
          claim: "Total five-year cost",
          status: "Different figures reported",
          reports: [
            { sourceName: "Daily Ledger", reportedValueOrPosition: "$40 million", sourceUrl: SAMPLE_URL },
            { sourceName: "Metro Wire", reportedValueOrPosition: "$46 million incl. stations", sourceUrl: SAMPLE_URL },
          ],
        },
      ],
      contextSummary:
        "The vote follows a 2024 route review that found 14 neighborhoods outside a 15-minute walk of a bus stop.",
      contextSources: [
        { name: "Daily Ledger", url: SAMPLE_URL },
        { name: "Metro Wire", url: SAMPLE_URL },
        { name: "Transit agency filing", url: SAMPLE_URL },
      ],
      analysisStatus: "available",
      isSampleData: true,
    },
  },
  {
    id: "rates",
    sourceName: "Reuters Wire",
    publishedAt: "21 Nov 2026",
    category: "Economy",
    title: "Central bank holds rate at 6.5% for a fourth straight meeting",
    excerpt: "Policymakers pointed to sticky food prices and a softer growth outlook in explaining the pause.",
    url: SAMPLE_URL,
    visual: 1,
    context: {
      secondPerspective: {
        headline: "Economists split on when the first cut could come",
        summary:
          "Surveyed economists expect a cut between March and September, with the earliest forecasts tied to a fall in food inflation.",
        sourceName: "Business Standard Daily",
        sourceUrl: SAMPLE_URL,
      },
      coverageGaps: [
        { question: "What inflation reading would prompt a cut?", explanation: "The statement describes conditions but gives no threshold." },
      ],
      differingClaims: [
        {
          claim: "Next-quarter inflation forecast",
          status: "Different figures reported",
          reports: [
            { sourceName: "Reuters Wire", reportedValueOrPosition: "4.8%", sourceUrl: SAMPLE_URL },
            { sourceName: "Business Standard Daily", reportedValueOrPosition: "5.1%", sourceUrl: SAMPLE_URL },
          ],
        },
      ],
      contextSummary:
        "The benchmark rate has been unchanged for four meetings while inflation remains above the bank's stated target range.",
      contextSources: [
        { name: "Reuters Wire", url: SAMPLE_URL },
        { name: "Business Standard Daily", url: SAMPLE_URL },
        { name: "Central bank statement", url: SAMPLE_URL },
      ],
      analysisStatus: "available",
      isSampleData: true,
    },
  },
  {
    id: "wind",
    sourceName: "Coastal Gazette",
    publishedAt: "20 Nov 2026",
    category: "Energy",
    title: "Regulators approve offshore wind farm along the northern coast",
    excerpt: "The 25-year lease allows for up to 80 turbines, with construction expected to begin in 2028.",
    url: SAMPLE_URL,
    visual: 2,
    context: {
      secondPerspective: {
        headline: "Fishing groups ask regulators to review turbine placement",
        summary:
          "Two fishing associations say the layout could narrow access to seasonal grounds and have requested a public hearing.",
        sourceName: "Harbour Times",
        sourceUrl: SAMPLE_URL,
      },
      coverageGaps: [
        { question: "Has the environmental review been published?" },
        { question: "What compensation, if any, is planned for affected fishing fleets?" },
      ],
      differingClaims: [
        {
          claim: "Homes the farm is expected to power",
          status: "Not independently confirmed",
          reports: [
            { sourceName: "Regulator statement", reportedValueOrPosition: "400,000", sourceUrl: SAMPLE_URL },
            { sourceName: "Harbour Times", reportedValueOrPosition: "about 310,000", sourceUrl: SAMPLE_URL },
          ],
        },
      ],
      contextSummary:
        "The approval follows a two-year consultation; the developer must still secure a grid-connection agreement.",
      contextSources: [
        { name: "Coastal Gazette", url: SAMPLE_URL },
        { name: "Harbour Times", url: SAMPLE_URL },
        { name: "Regulator statement", url: SAMPLE_URL },
      ],
      analysisStatus: "available",
      isSampleData: true,
    },
  },
];

/* ---------- editorial visuals (inline SVG, no external images) ---------- */
function Visual({ variant }: { variant: 0 | 1 | 2 }) {
  if (variant === 0)
    return (
      <svg viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="v0" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#12353b" />
            <stop offset="1" stopColor="#2a6f78" />
          </linearGradient>
        </defs>
        <rect width="400" height="320" fill="url(#v0)" />
        {[40, 90, 140, 190, 240, 290].map((y) => (
          <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#f3ecd9" strokeOpacity="0.07" />
        ))}
        <path d="M-10 250 C90 250 110 140 210 140 S330 70 420 60" stroke="#f3ecd9" strokeWidth="9" fill="none" strokeLinecap="round" />
        <path d="M-10 90 C70 110 140 200 230 210 S350 250 420 230" stroke="#ffb020" strokeWidth="9" fill="none" strokeLinecap="round" />
        {[[110, 190], [210, 140], [330, 85], [230, 210], [140, 150]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="11" fill="#12353b" stroke="#f3ecd9" strokeWidth="5" />
        ))}
      </svg>
    );
  if (variant === 1)
    return (
      <svg viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="v1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b2a17" />
            <stop offset="1" stopColor="#7a5a32" />
          </linearGradient>
        </defs>
        <rect width="400" height="320" fill="url(#v1)" />
        {[60, 110, 160, 210, 260].map((y) => (
          <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#f3ecd9" strokeOpacity="0.1" />
        ))}
        {[70, 110, 90, 140, 125, 170, 150, 200].map((h, i) => (
          <rect key={i} x={30 + i * 44} y={290 - h} width="28" height={h} fill="#f3ecd9" fillOpacity={i === 7 ? 0.95 : 0.35} />
        ))}
        <polyline points="44,200 88,170 132,185 176,140 220,155 264,110 308,125 352,80" fill="none" stroke="#ffb020" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="v2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d2a4a" />
          <stop offset="0.7" stopColor="#c9784a" />
          <stop offset="1" stopColor="#e9b872" />
        </linearGradient>
      </defs>
      <rect width="400" height="320" fill="url(#v2)" />
      <rect y="250" width="400" height="70" fill="#101a2e" />
      {[70, 170, 270, 350].map((x, i) => (
        <g key={x} transform={`translate(${x} ${i % 2 ? 258 : 252}) scale(${i % 2 ? 0.8 : 1})`}>
          <rect x="-3" y="-150" width="6" height="150" fill="#f3ecd9" />
          <g transform="translate(0 -150)" stroke="#f3ecd9" strokeWidth="5" strokeLinecap="round">
            <line x1="0" y1="0" x2="0" y2="-62" />
            <line x1="0" y1="0" x2="54" y2="31" />
            <line x1="0" y1="0" x2="-54" y2="31" />
          </g>
        </g>
      ))}
    </svg>
  );
}

/* ---------- panel states ---------- */
function Chip({ children }: { children: ReactNode }) {
  return <span className="ctx-chip">{children}</span>;
}

function Panel({ article }: { article: ContextArticle }) {
  const c = article.context;
  if (c.analysisStatus === "pending")
    return <p className="ctx-empty">Context is being prepared for this story.</p>;
  if (c.analysisStatus === "unavailable")
    return (
      <p className="ctx-empty">
        No additional perspective found yet. We only show context that sources support, so this panel stays
        empty until we have some.
      </p>
    );
  return (
    <>
      <p className="ctx-eyebrow">Second perspective</p>
      {c.secondPerspective ? (
        <>
          <h4 className="ctx-alt-head">{c.secondPerspective.headline}</h4>
          <p className="ctx-text">
            {c.secondPerspective.summary}{" "}
            <a href={c.secondPerspective.sourceUrl} target="_blank" rel="noopener noreferrer">
              {c.secondPerspective.sourceName} ↗
            </a>
          </p>
        </>
      ) : (
        <p className="ctx-text">No additional perspective found yet.</p>
      )}

      {c.coverageGaps.length > 0 && (
        <div className="ctx-block">
          <p className="ctx-label">What may be missing</p>
          <ul>
            {c.coverageGaps.slice(0, 1).map((g) => (
              <li key={g.question}>{g.question}</li>
            ))}
          </ul>
        </div>
      )}

      {c.differingClaims[0] && (
        <div className="ctx-block">
          <p className="ctx-label">
            {c.differingClaims[0].claim} <Chip>{c.differingClaims[0].status}</Chip>
          </p>
          <ul className="ctx-reports">
            {c.differingClaims[0].reports.map((r) => (
              <li key={r.sourceName}>
                <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer">
                  {r.sourceName}
                </a>
                <b>{r.reportedValueOrPosition}</b>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="ctx-block">
        <p className="ctx-label">Context</p>
        <p className="ctx-text">{c.contextSummary}</p>
      </div>

      <p className="ctx-sources">
        Sources:{" "}
        {c.contextSources.map((s, i) => (
          <span key={s.name}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.name}
            </a>
            {i < c.contextSources.length - 1 ? " · " : ""}
          </span>
        ))}
      </p>
    </>
  );
}

function Card({ article }: { article: ContextArticle }) {
  const [open, setOpen] = useState(false);
  const panelId = `ctx-panel-${article.id}`;
  return (
    <div className="ctx-card" data-open={open}>
      {/* layer 2: tucked underneath */}
      <section className="ctx-under" id={panelId} aria-label={`Story context for ${article.title}`}>
        <div className="ctx-under-inner">
          <Panel article={article} />
        </div>
        <footer className="ctx-under-foot">
          <span>AI-assisted context · links show the supporting sources</span>
          {article.context.isSampleData && <b>Sample data</b>}
        </footer>
      </section>

      {/* layer 1: the article as printed */}
      <article className="ctx-top">
        <div className="ctx-image">
          <Visual variant={article.visual} />
          <div className="ctx-shade" />
          <div className="ctx-image-text">
            <p className="ctx-meta">
              <span>{article.sourceName}</span>
              <span>{article.publishedAt}</span>
            </p>
            <h3 className="ctx-title">
              <a href={article.url} target="_blank" rel="noopener noreferrer">
                {article.title}
              </a>
            </h3>
          </div>
        </div>
        <div className="ctx-dek">
          <span className="ctx-cat">{article.category}</span>
          <p>{article.excerpt}</p>
          <span className="ctx-cue" aria-hidden="true">
            Hover for story context
          </span>
        </div>
      </article>

      <button
        type="button"
        className="ctx-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ctx-toggle-open">Show story context</span>
        <span className="ctx-toggle-close">Close</span>
      </button>
    </div>
  );
}

const css = `
.ctx-section {
  background: #000;
  color: #f3ecd9;
  padding: 7rem 1.25rem 8rem;
  background-image: radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,176,32,0.09), transparent 70%);
}
.ctx-intro { max-width: 46rem; margin: 0 auto 3.5rem; text-align: center; }
.ctx-intro .ctx-eyebrow-big {
  font-family: "Special Elite", "Courier New", monospace;
  font-size: 0.78rem; letter-spacing: 0.22em; text-transform: uppercase; color: #ffb020;
}
.ctx-intro h2 {
  margin-top: 1rem;
  font-family: "Playfair Display", Georgia, serif;
  font-weight: 900;
  font-size: clamp(2.2rem, 6vw, 4rem);
  line-height: 1.05;
  letter-spacing: -0.02em;
}
.ctx-intro h2 em { color: #ffb020; }
.ctx-intro p.sub { margin-top: 1.1rem; font-size: 1.05rem; line-height: 1.6; color: rgba(243,236,217,0.6); }

.ctx-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(17.5rem, 1fr));
  gap: 2rem;
  max-width: 72rem;
  margin: 0 auto;
}

/* ---- card ---- */
.ctx-card {
  --lift: 55%;
  position: relative;
  height: 47rem;
  overflow: hidden;
  border-radius: 2px;
  background: #101114;
  box-shadow: 0 1.5rem 3rem rgba(0,0,0,0.6);
  isolation: isolate;
}

.ctx-top {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  color: #17130d;
  background-color: #f0e8d4;
  background-image:
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.15  0 0 0 0.16 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>");
  box-shadow: 0 0.6rem 1.4rem rgba(0,0,0,0.35);
  transition: transform 0.42s cubic-bezier(0.22, 0.8, 0.2, 1), box-shadow 0.42s;
  will-change: transform;
}
.ctx-image { position: relative; flex: 0 0 45%; order: 2; overflow: hidden; background: #12353b; }
.ctx-image svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; filter: sepia(0.25) contrast(1.05); }
.ctx-shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.05) 25%, rgba(8,6,3,0.88) 100%); }
.ctx-image-text { position: absolute; left: 0; right: 0; bottom: 0; padding: 1.3rem 1.4rem 1.1rem; color: #f6efdc; }
.ctx-meta {
  display: flex; justify-content: space-between; gap: 1rem;
  font-family: "Special Elite", "Courier New", monospace;
  font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase;
  color: rgba(246,239,220,0.75);
  margin-bottom: 0.55rem;
}
.ctx-title {
  font-family: "Playfair Display", Georgia, serif;
  font-weight: 900;
  font-size: clamp(1.25rem, 2.2vw, 1.6rem);
  line-height: 1.12;
  letter-spacing: -0.015em;
}
.ctx-title a { color: inherit; text-decoration: none; }
.ctx-title a:hover { text-decoration: underline; text-decoration-color: #ffb020; text-underline-offset: 0.2em; }
.ctx-dek { order: 1; flex: 1; padding: 1.3rem 1.4rem 1.4rem; display: flex; flex-direction: column; gap: 0.85rem; }
.ctx-cat {
  align-self: flex-start;
  font-family: "Special Elite", "Courier New", monospace;
  font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase;
  padding: 0.15rem 0.5rem; border: 1px solid #17130d;
}
.ctx-dek p { font-family: "Playfair Display", Georgia, serif; font-size: 1.02rem; line-height: 1.55; color: #2b251b; }
.ctx-cue {
  margin-top: auto;
  font-family: "Special Elite", "Courier New", monospace;
  font-size: 0.74rem; letter-spacing: 0.12em; text-transform: uppercase;
  color: #8a5a00;
}
.ctx-cue::before { content: "↑ "; }

/* ---- layer underneath ---- */
.ctx-under {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  padding-top: calc(var(--lift) + 0.9rem);
  background: #101114;
  color: #ece6d6;
  visibility: hidden;
  opacity: 0;
  transform: translateY(1.2rem);
  transition: transform 0.42s cubic-bezier(0.22, 0.8, 0.2, 1), opacity 0.3s, visibility 0s linear 0.42s;
}
.ctx-under-inner { flex: 1; min-height: 0; overflow-y: auto; padding: 0 1.4rem 0.6rem; font-size: 0.8rem; line-height: 1.4; scrollbar-width: thin; }
.ctx-eyebrow {
  font-family: "Special Elite", "Courier New", monospace;
  font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; color: #ffb020;
  padding-bottom: 0.4rem; border-bottom: 1px solid rgba(236,230,214,0.25); margin-bottom: 0.7rem;
}
.ctx-alt-head { font-family: "Playfair Display", Georgia, serif; font-weight: 800; font-size: 1.12rem; line-height: 1.2; margin-bottom: 0.4rem; }
.ctx-text { color: rgba(236,230,214,0.78); }
.ctx-block { margin-top: 0.8rem; padding-top: 0.6rem; border-top: 1px solid rgba(236,230,214,0.14); }
.ctx-label {
  display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem;
  font-family: "Special Elite", "Courier New", monospace;
  font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(236,230,214,0.55);
  margin-bottom: 0.3rem;
}
.ctx-block ul { list-style: none; display: grid; gap: 0.25rem; color: rgba(236,230,214,0.85); }
.ctx-block ul:not(.ctx-reports) li::before { content: "? "; color: #ffb020; font-weight: 700; }
.ctx-reports li { display: flex; justify-content: space-between; gap: 1rem; }
.ctx-reports b { font-weight: 600; color: #f3ecd9; text-align: right; }
.ctx-chip {
  display: inline-block; padding: 0.05rem 0.45rem; border: 1px solid rgba(255,176,32,0.6);
  color: #ffb020; border-radius: 999px; letter-spacing: 0.06em; text-transform: none;
}
.ctx-sources { margin-top: 0.8rem; font-size: 0.74rem; color: rgba(236,230,214,0.5); }
.ctx-empty { color: rgba(236,230,214,0.7); font-size: 0.9rem; line-height: 1.5; padding-top: 0.5rem; }
.ctx-under a { color: #f3ecd9; text-decoration: underline; text-decoration-color: rgba(255,176,32,0.7); text-underline-offset: 0.18em; }
.ctx-under a:hover { color: #ffb020; }
.ctx-under-foot {
  display: flex; justify-content: space-between; align-items: center; gap: 1rem;
  padding: 0.6rem 1.4rem 0.8rem; border-top: 1px solid rgba(236,230,214,0.14);
  font-family: "Special Elite", "Courier New", monospace;
  font-size: 0.62rem; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(236,230,214,0.45);
}
.ctx-under-foot b { color: #101114; background: #ffb020; padding: 0.1rem 0.45rem; font-weight: 700; white-space: nowrap; }

/* ---- toggle (touch + keyboard + screen readers) ---- */
.ctx-toggle {
  position: absolute; top: 0.8rem; right: 0.8rem; z-index: 5;
  padding: 0.45rem 0.8rem;
  border: 1px solid rgba(246,239,220,0.55);
  background: rgba(10,8,5,0.72);
  color: #f6efdc;
  font-family: "Special Elite", "Courier New", monospace;
  font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase;
  cursor: pointer;
}
.ctx-toggle:focus-visible, .ctx-card a:focus-visible { outline: 2px solid #ffb020; outline-offset: 2px; }
.ctx-toggle .ctx-toggle-close { display: none; }

/* ---- open state: tap toggle, hover (real pointers only), keyboard focus ---- */
.ctx-card[data-open="true"] .ctx-top,
.ctx-card:has(:focus-visible) .ctx-top { transform: translateY(calc(var(--lift) * -1)); box-shadow: 0 1.2rem 2.2rem rgba(0,0,0,0.55); }
.ctx-card[data-open="true"] .ctx-under,
.ctx-card:has(:focus-visible) .ctx-under { visibility: visible; opacity: 1; transform: none; transition: transform 0.42s cubic-bezier(0.22, 0.8, 0.2, 1), opacity 0.3s, visibility 0s; }
.ctx-card[data-open="true"] .ctx-toggle-open { display: none; }
.ctx-card[data-open="true"] .ctx-toggle-close { display: inline; }
.ctx-card[data-open="true"] .ctx-cue { opacity: 0; }

@media (hover: hover) and (pointer: fine) {
  .ctx-card:hover .ctx-top { transform: translateY(calc(var(--lift) * -1)); box-shadow: 0 1.2rem 2.2rem rgba(0,0,0,0.55); }
  .ctx-card:hover .ctx-under { visibility: visible; opacity: 1; transform: none; transition: transform 0.42s cubic-bezier(0.22, 0.8, 0.2, 1), opacity 0.3s, visibility 0s; }
  .ctx-toggle { opacity: 0; pointer-events: none; }
  .ctx-toggle:focus-visible { opacity: 1; pointer-events: auto; }
}
@media (hover: none) { .ctx-cue { display: none; } }
@media (prefers-reduced-motion: reduce) {
  .ctx-top, .ctx-under { transition: none !important; transform: none; }
  .ctx-card[data-open="true"] .ctx-top, .ctx-card:has(:focus-visible) .ctx-top { transform: translateY(calc(var(--lift) * -1)); }
}
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: reduce) {
  .ctx-card:hover .ctx-top { transform: translateY(calc(var(--lift) * -1)); }
}
@media (max-width: 560px) { .ctx-card { height: 46rem; } }
`;

export default function ContextCards({ articles = ARTICLES }: { articles?: ContextArticle[] }) {
  return (
    <section className="ctx-section" aria-label="Stories with second perspectives">
      <style>{css}</style>
      <div className="ctx-intro">
        <p className="ctx-eyebrow-big">Story context</p>
        <h2>
          The headline is only <em>the front page.</em>
        </h2>
        <p className="sub">
          Hover a story to see what else is going on: another outlet&apos;s angle, what the article may leave out,
          and where reports differ. Every point links to its source.
        </p>
      </div>
      <div className="ctx-grid">
        {articles.map((a) => (
          <Card key={a.id} article={a} />
        ))}
      </div>
    </section>
  );
}
export { ContextCards as Component };

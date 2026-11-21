"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";

/* One article, rendered twice with identical layout.
   Layer 1: the newspaper as printed.  Layer 2 (inside the lens): the X-ray view.
   Because both layers share the same text, the lens lines up perfectly. */

type Mark = { tech: string; fix: string };

function Spin({ xray, mark, children }: { xray: boolean; mark: Mark; children: ReactNode }) {
  if (!xray) return <span>{children}</span>;
  return (
    <mark className="lens-spin" data-tech={mark.tech} data-fix={mark.fix}>
      {children}
    </mark>
  );
}

function Fact({ xray, children }: { xray: boolean; children: ReactNode }) {
  if (!xray) return <span>{children}</span>;
  return <span className="lens-fact">{children}</span>;
}

function Article({ xray }: { xray: boolean }) {
  return (
    <div className={`lens-paper ${xray ? "is-xray" : "is-print"}`} aria-hidden={xray}>
      <header className="lens-mast">
        <span className="lens-masthead">{xray ? "TruthLens X-Ray" : "The Daily Ledger"}</span>
        <span className="lens-dateline">
          {xray ? "6 flags · 2 verified facts" : "Tuesday, 21 November 2026"}
        </span>
      </header>
      <div className="lens-rule" />

      <h3 className="lens-headline">
        Council{" "}
        <Spin xray={xray} mark={{ tech: "Loaded language", fix: "criticizes new" }}>
          Slams Reckless
        </Spin>{" "}
        Transit Plan as Businesses{" "}
        <Spin xray={xray} mark={{ tech: "Fear appeal", fix: "may be affected" }}>
          Face Ruin
        </Spin>
      </h3>

      <div className="lens-byline">
        <span>{xray ? "Manipulation score" : "By Staff Reporter"}</span>
        <span className="lens-score">
          <i style={{ width: xray ? "72%" : "0%" }} />
        </span>
        <span>{xray ? "72 / 100" : "6 min read"}</span>
      </div>

      <div className="lens-body">
        <figure className="lens-figure">
          <div className="lens-photo" />
          <figcaption>
            {xray ? "File photo, not taken at the debate" : "Commuters wait at Central Station"}
          </figcaption>
        </figure>

        <p>
          City council members{" "}
          <Spin xray={xray} mark={{ tech: "Loaded language", fix: "criticized a" }}>
            slammed a reckless
          </Spin>{" "}
          new transit plan on Tuesday, warning it{" "}
          <Spin xray={xray} mark={{ tech: "Fear appeal", fix: "could affect" }}>
            will devastate
          </Spin>{" "}
          local businesses along the proposed routes.
        </p>
        <p>
          The plan{" "}
          <Fact xray={xray}>adds 12 bus routes and would cost $40 million over five years</Fact>.{" "}
          <Spin xray={xray} mark={{ tech: "Bandwagon", fix: "some say" }}>
            Everyone knows
          </Spin>{" "}
          commuters will suffer, and officials have offered{" "}
          <Spin xray={xray} mark={{ tech: "Unsupported claim", fix: "no data yet" }}>
            no evidence
          </Spin>{" "}
          the plan works.
        </p>
        <p>
          Critics call the proposal a{" "}
          <Spin xray={xray} mark={{ tech: "Loaded language", fix: "contested idea" }}>
            desperate gamble
          </Spin>
          . The mayor&apos;s office declined to comment, leaving residents to{" "}
          <Spin xray={xray} mark={{ tech: "Emotional appeal", fix: "await details" }}>
            fear the worst
          </Spin>
          .
        </p>
      </div>
    </div>
  );
}

const css = `
@property --lens-r {
  syntax: "<length>";
  inherits: true;
  initial-value: 0px;
}

.lens-section {
  position: relative;
  background: #000;
  color: #f3ecd9;
  padding: 7rem 1.25rem 8rem;
  overflow: hidden;
  background-image:
    radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,176,32,0.10), transparent 70%);
}
.lens-intro { max-width: 46rem; margin: 0 auto 3.5rem; text-align: center; }
.lens-eyebrow {
  font-family: "Special Elite", "Courier New", monospace;
  font-size: 0.78rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #ffb020;
}
.lens-title {
  margin-top: 1rem;
  font-family: "Playfair Display", Georgia, serif;
  font-weight: 900;
  font-size: clamp(2.2rem, 6vw, 4.2rem);
  line-height: 1.04;
  letter-spacing: -0.02em;
}
.lens-title em { color: #ffb020; font-weight: 800; }
.lens-sub {
  margin-top: 1.1rem;
  font-size: 1.05rem;
  line-height: 1.6;
  color: rgba(243,236,217,0.6);
}

.lens-stage {
  position: relative;
  max-width: 62rem;
  margin: 0 auto;
  cursor: crosshair;
  touch-action: pan-y;
  --lx: 50%;
  --ly: 45%;
  --lens-r: 0px;
  transition: --lens-r 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
  filter: drop-shadow(0 2rem 3rem rgba(0,0,0,0.7));
}
.lens-stage[data-active="true"] { --lens-r: 175px; }
@media (max-width: 700px) { .lens-stage[data-active="true"] { --lens-r: 120px; } }

.lens-layer { position: relative; }
.lens-layer.xray {
  position: absolute;
  inset: 0;
  -webkit-clip-path: circle(var(--lens-r) at var(--lx) var(--ly));
  clip-path: circle(var(--lens-r) at var(--lx) var(--ly));
  pointer-events: none;
}
.lens-ring {
  position: absolute;
  left: var(--lx);
  top: var(--ly);
  width: calc(var(--lens-r) * 2);
  height: calc(var(--lens-r) * 2);
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2px solid #ffb020;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.5), 0 0 2.5rem rgba(255,176,32,0.45), inset 0 0 2rem rgba(255,176,32,0.18);
  pointer-events: none;
  z-index: 5;
}
.lens-hint {
  position: absolute;
  left: 50%;
  top: 46%;
  z-index: 6;
  transform: translate(-50%, -50%);
  padding: 0.7rem 1.2rem;
  border-radius: 999px;
  background: #17130d;
  color: #f3ecd9;
  font-family: "Special Elite", "Courier New", monospace;
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  border: 1px solid rgba(255,176,32,0.6);
  pointer-events: none;
  transition: opacity 0.3s;
  animation: lens-pulse 2.2s ease-in-out infinite;
}
.lens-stage[data-active="true"] .lens-hint { opacity: 0; }
@keyframes lens-pulse { 50% { transform: translate(-50%, -50%) scale(1.06); } }

/* ---- the article ---- */
.lens-paper {
  position: relative;
  padding: 2.4rem 2.8rem 2.8rem;
  min-height: 100%;
  font-family: "Playfair Display", Georgia, serif;
  line-height: 2.05;
}
.lens-paper.is-print {
  color: #17130d;
  background-color: #f0e8d4;
  background-image:
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.15  0 0 0 0.16 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>"),
    linear-gradient(115deg, rgba(255,255,255,0.35), rgba(0,0,0,0.06) 70%);
  clip-path: polygon(0 0.6%, 8% 0, 17% 0.7%, 30% 0.1%, 44% 0.8%, 58% 0, 72% 0.7%, 86% 0.1%, 100% 0.6%, 99.6% 30%, 100% 62%, 99.5% 100%, 90% 99.4%, 76% 100%, 62% 99.3%, 48% 100%, 33% 99.4%, 19% 100%, 8% 99.3%, 0 100%, 0.4% 64%, 0 33%);
}
.lens-paper.is-xray {
  color: #efe7d2;
  background: #0c0c0e;
  background-image:
    repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 4px),
    radial-gradient(ellipse at 30% 20%, rgba(255,176,32,0.12), transparent 60%);
  clip-path: polygon(0 0.6%, 8% 0, 17% 0.7%, 30% 0.1%, 44% 0.8%, 58% 0, 72% 0.7%, 86% 0.1%, 100% 0.6%, 99.6% 30%, 100% 62%, 99.5% 100%, 90% 99.4%, 76% 100%, 62% 99.3%, 48% 100%, 33% 99.4%, 19% 100%, 8% 99.3%, 0 100%, 0.4% 64%, 0 33%);
}

.lens-mast {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  line-height: 1.2;
}
.lens-masthead {
  font-style: italic;
  font-weight: 800;
  font-size: clamp(1.5rem, 3.6vw, 2.5rem);
  letter-spacing: -0.01em;
}
.is-xray .lens-masthead { font-style: normal; font-family: "Special Elite", "Courier New", monospace; color: #ffb020; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 400; }
.lens-dateline {
  font-family: "Special Elite", "Courier New", monospace;
  font-size: clamp(0.65rem, 1.4vw, 0.82rem);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.6;
  text-align: right;
}
.lens-rule { height: 0.28rem; margin: 0.8rem 0 1.4rem; border-top: 2px solid currentColor; border-bottom: 1px solid currentColor; opacity: 0.8; }

.lens-headline {
  font-weight: 900;
  font-size: clamp(1.7rem, 4.4vw, 3.1rem);
  line-height: 1.3;
  letter-spacing: -0.02em;
}
.lens-byline {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  margin: 1rem 0 1.4rem;
  font-family: "Special Elite", "Courier New", monospace;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1.2;
  opacity: 0.75;
}
.lens-score { flex: 1; max-width: 14rem; height: 0.55rem; border: 1px solid currentColor; }
.lens-score i { display: block; height: 100%; background: #ffb020; }

.lens-body { column-count: 2; column-gap: 2.4rem; font-size: clamp(0.95rem, 1.5vw, 1.08rem); }
@media (max-width: 760px) { .lens-body { column-count: 1; } .lens-paper { padding: 1.6rem 1.3rem 2rem; } }
.lens-body p { margin: 0 0 1.1rem; break-inside: avoid-column; text-align: justify; hyphens: auto; }
.lens-figure { margin: 0 0 1.1rem; break-inside: avoid-column; }
.lens-photo {
  height: 8.5rem;
  border: 2px solid currentColor;
  background:
    radial-gradient(circle at 50% 50%, rgba(23,19,13,0.85) 30%, transparent 33%) 0 0 / 7px 7px,
    #cfc8b6;
  -webkit-mask-image: radial-gradient(ellipse 90% 90% at 40% 45%, #000 20%, rgba(0,0,0,0.3) 85%);
  mask-image: radial-gradient(ellipse 90% 90% at 40% 45%, #000 20%, rgba(0,0,0,0.3) 85%);
}
.is-xray .lens-photo {
  background:
    radial-gradient(circle at 50% 50%, rgba(255,176,32,0.8) 30%, transparent 33%) 0 0 / 7px 7px,
    #1a1409;
}
.lens-figure figcaption {
  margin-top: 0.4rem;
  font-family: "Special Elite", "Courier New", monospace;
  font-size: 0.72rem;
  line-height: 1.3;
  letter-spacing: 0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.7;
}

/* x-ray annotations (absolute, so they never shift the layout) */
.lens-spin {
  position: relative;
  color: #17130d;
  background: #ffb020;
  padding: 0;
  border-radius: 0.2em;
  box-shadow: 0 0 0 0.14em #ffb020;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}
.lens-spin::before {
  content: attr(data-tech);
  position: absolute;
  left: 0;
  top: -1.05em;
  padding: 0 0.35em;
  border-radius: 0.2em;
  background: #d92d20;
  color: #fff;
  font-family: "Special Elite", "Courier New", monospace;
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1.5;
  white-space: nowrap;
}
.lens-spin::after {
  content: "→ " attr(data-fix);
  position: absolute;
  left: 0;
  top: calc(100% + 0.05em);
  padding: 0 0.35em;
  border-radius: 0.2em;
  background: #1f9d63;
  color: #fff;
  font-family: "Special Elite", "Courier New", monospace;
  font-size: 0.62rem;
  letter-spacing: 0.04em;
  line-height: 1.5;
  white-space: nowrap;
  z-index: 2;
}
.lens-fact {
  border-bottom: 3px solid #1f9d63;
  background: rgba(31,157,99,0.16);
}

.lens-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem 1.5rem;
  max-width: 62rem;
  margin: 2.5rem auto 0;
  font-family: "Special Elite", "Courier New", monospace;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(243,236,217,0.65);
}
.lens-legend span { display: inline-flex; align-items: center; gap: 0.5rem; }
.lens-legend b { width: 0.8rem; height: 0.8rem; border-radius: 0.2rem; display: inline-block; }
`;

export default function LensReveal() {
  const stageRef = useRef<HTMLDivElement>(null);

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--lx", `${e.clientX - r.left}px`);
    el.style.setProperty("--ly", `${e.clientY - r.top}px`);
    el.dataset.active = "true";
  };
  const leave = () => {
    if (stageRef.current) stageRef.current.dataset.active = "false";
  };

  return (
    <section className="lens-section" aria-label="Same article, two perspectives">
      <style>{css}</style>
      <div className="lens-intro">
        <p className="lens-eyebrow">Two ways to read one story</p>
        <h2 className="lens-title">
          Same article. <em>Different lens.</em>
        </h2>
        <p className="lens-sub">
          What you read is only half of it. Move your cursor over the page to see how the words are
          trying to move you, and what the story says without the spin.
        </p>
      </div>

      <div
        className="lens-stage"
        ref={stageRef}
        data-active="false"
        onPointerMove={move}
        onPointerDown={move}
        onPointerLeave={leave}
        onPointerCancel={leave}
      >
        <div className="lens-layer">
          <Article xray={false} />
        </div>
        <div className="lens-layer xray">
          <Article xray />
        </div>
        <div className="lens-ring" />
        <div className="lens-hint">Hover to reveal the other side</div>
      </div>

      <div className="lens-legend" aria-hidden="true">
        <span><b style={{ background: "#ffb020" }} /> Manipulative wording</span>
        <span><b style={{ background: "#d92d20" }} /> Technique used</span>
        <span><b style={{ background: "#1f9d63" }} /> Neutral rewrite &amp; verified facts</span>
      </div>
    </section>
  );
}
export { LensReveal as Component };

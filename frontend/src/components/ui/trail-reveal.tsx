"use client";

import { useEffect, useRef, useState } from "react";

/* Cursor-trail reveal.
   The upper layer is the article as printed. The layer beneath is the same story with the spin
   removed. A chain of the pointer's recent positions is drawn as a tapering brush; the brush is
   blurred, warped by noise and thresholded (a "liquid" edge) and used as an SVG mask over the
   second layer. A resting cursor reveals nothing: the brush is gated by pointer speed. */

const N = 24; // trail samples
const SWEEP = [
  { x: -0.85, y: -0.62 },
  { x: 0.78, y: -0.2 },
  { x: -0.7, y: 0.2 },
  { x: 0.82, y: 0.6 },
];

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function FrontPage() {
  return (
    <div className="tr-page tr-front">
      <header className="tr-mast">
        <span className="tr-masthead">The Daily Ledger</span>
        <span className="tr-dateline">Tuesday, 21 November 2026</span>
      </header>
      <div className="tr-rule" />
      <h3 className="tr-headline">Council Slams Reckless Transit Plan as Businesses Face Ruin</h3>
      <div className="tr-byline">
        <span>By Staff Reporter</span>
        <span>6 min read</span>
      </div>
      <div className="tr-cols">
        <figure className="tr-figure">
          <div className="tr-photo" />
          <figcaption>Commuters wait at Central Station</figcaption>
        </figure>
        <p>
          City council members slammed a reckless new transit plan on Tuesday, warning it will devastate
          local businesses along the proposed routes.
        </p>
        <p>
          The plan adds 12 bus routes and would cost $40 million over five years. Everyone knows
          commuters will suffer, and officials have offered no evidence the plan works.
        </p>
        <p className="tr-sm-hide">
          Critics call the proposal a desperate gamble. The mayor&apos;s office declined to comment,
          leaving residents to fear the worst.
        </p>
      </div>
    </div>
  );
}

function BackPage() {
  return (
    <div className="tr-page tr-back">
      <header className="tr-mast">
        <span className="tr-masthead">Second perspective</span>
        <span className="tr-dateline">Same story · spin set aside</span>
      </header>
      <div className="tr-rule" />
      <h3 className="tr-headline">
        City council debates a $40 million, 12-route bus expansion
      </h3>
      <div className="tr-byline">
        <span>Neutral rewrite</span>
        <span>6 phrases set aside</span>
      </div>
      <div className="tr-cols">
        <div className="tr-block">
          <h4>What the reporting supports</h4>
          <p>
            Council members criticized the plan on Tuesday, saying it could affect local businesses. The
            plan adds 12 bus routes and would cost $40 million over five years.
          </p>
        </div>
        <div className="tr-block">
          <h4>Phrases set aside</h4>
          <ul className="tr-swaps">
            <li><s>slammed a reckless</s> <b>criticized a</b></li>
            <li><s>will devastate</s> <b>could affect</b></li>
            <li><s>everyone knows</s> <b>some say</b></li>
            <li><s>no evidence</s> <b>no data yet</b></li>
          </ul>
        </div>
        <div className="tr-block">
          <h4>What may be missing</h4>
          <ul className="tr-q">
            <li>How was the $40 million figure calculated?</li>
            <li>Is there ridership data supporting or contradicting the plan?</li>
            <li>What does the mayor&apos;s office say?</li>
          </ul>
        </div>
        <p className="tr-foot">
          Sample data · AI-assisted rewrite · every claim should link to its source. Flags describe wording,
          not truth.
        </p>
      </div>
    </div>
  );
}

const css = `
.tr-section {
  background: #f5f1e6;
  color: #17130d;
  padding: 7rem 1.25rem 7rem;
  background-image: radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,176,32,0.22), transparent 70%);
}
.tr-intro { max-width: 46rem; margin: 0 auto 3rem; text-align: center; }
.tr-eyebrow { font-family: "Special Elite", "Courier New", monospace; font-size: 0.78rem; letter-spacing: 0.22em; text-transform: uppercase; color: #b86e00; }
.tr-title { margin-top: 1rem; font-family: "Playfair Display", Georgia, serif; font-weight: 900; font-size: clamp(2.2rem, 6vw, 4.2rem); line-height: 1.04; letter-spacing: -0.02em; }
.tr-title em { color: #c77700; }
.tr-sub { margin-top: 1.1rem; font-size: 1.05rem; line-height: 1.6; color: rgba(23,19,13,0.65); }

.tr-stage {
  position: relative;
  max-width: 62rem;
  height: 41rem;
  margin: 0 auto;
  cursor: crosshair;
  touch-action: pan-y;
  filter: drop-shadow(0 1.6rem 2.4rem rgba(60,40,10,0.3));
  user-select: none;
}
@media (max-width: 760px) { .tr-stage { height: 49rem; } }
.tr-overlay { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: hidden; }

.tr-page {
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding: 2.2rem 2.6rem;
  font-family: "Playfair Display", Georgia, serif;
  line-height: 1.7;
  clip-path: polygon(0 0.6%, 8% 0, 17% 0.7%, 30% 0.1%, 44% 0.8%, 58% 0, 72% 0.7%, 86% 0.1%, 100% 0.6%, 99.6% 30%, 100% 62%, 99.5% 100%, 90% 99.4%, 76% 100%, 62% 99.3%, 48% 100%, 33% 99.4%, 19% 100%, 8% 99.3%, 0 100%, 0.4% 64%, 0 33%);
}
.tr-front {
  color: #17130d;
  background-color: #f0e8d4;
  background-image:
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.15  0 0 0 0.16 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>"),
    linear-gradient(115deg, rgba(255,255,255,0.35), rgba(0,0,0,0.06) 70%);
}
.tr-back {
  color: #10211e;
  background-color: #e6f4f1;
  background-image:
    linear-gradient(rgba(10,124,111,0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(10,124,111,0.07) 1px, transparent 1px),
    radial-gradient(ellipse at 20% 10%, rgba(255,255,255,0.8), transparent 60%);
  background-size: 28px 28px, 28px 28px, auto;
}

.tr-mast { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; line-height: 1.2; }
.tr-masthead { font-style: italic; font-weight: 800; font-size: clamp(1.4rem, 3.4vw, 2.3rem); letter-spacing: -0.01em; }
.tr-back .tr-masthead { font-style: normal; font-family: "Special Elite", "Courier New", monospace; font-weight: 400; color: #0a7c6f; text-transform: uppercase; letter-spacing: 0.06em; }
.tr-dateline { font-family: "Special Elite", "Courier New", monospace; font-size: clamp(0.62rem, 1.3vw, 0.8rem); letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.6; text-align: right; }
.tr-rule { height: 0.28rem; margin: 0.8rem 0 1.2rem; border-top: 2px solid currentColor; border-bottom: 1px solid currentColor; opacity: 0.8; }
.tr-headline { font-weight: 900; font-size: clamp(1.6rem, 4.2vw, 3rem); line-height: 1.12; letter-spacing: -0.02em; }
.tr-byline { display: flex; justify-content: space-between; gap: 1rem; margin: 0.9rem 0 1.2rem; padding-bottom: 0.7rem; border-bottom: 1px solid currentColor; font-family: "Special Elite", "Courier New", monospace; font-size: 0.74rem; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.75; }
.tr-cols { column-count: 2; column-gap: 2.4rem; font-size: clamp(0.9rem, 1.45vw, 1.04rem); }
.tr-cols p, .tr-block { margin: 0 0 1rem; break-inside: avoid-column; }
.tr-cols p { text-align: justify; hyphens: auto; }
.tr-figure { margin: 0 0 1rem; break-inside: avoid-column; }
.tr-photo { height: 8.5rem; border: 2px solid currentColor; background: radial-gradient(circle at 50% 50%, rgba(23,19,13,0.85) 30%, transparent 33%) 0 0 / 7px 7px, #cfc8b6; -webkit-mask-image: radial-gradient(ellipse 90% 90% at 40% 45%, #000 20%, rgba(0,0,0,0.3) 85%); mask-image: radial-gradient(ellipse 90% 90% at 40% 45%, #000 20%, rgba(0,0,0,0.3) 85%); }
.tr-figure figcaption { margin-top: 0.4rem; font-family: "Special Elite", "Courier New", monospace; font-size: 0.72rem; opacity: 0.7; }
@media (max-width: 760px) { .tr-cols { column-count: 1; } .tr-page { padding: 1.4rem 1.2rem; } .tr-sm-hide { display: none; } .tr-photo { height: 5rem; } }

.tr-block h4 { font-family: "Special Elite", "Courier New", monospace; font-weight: 400; font-size: 0.72rem; letter-spacing: 0.16em; text-transform: uppercase; color: #0a7c6f; margin-bottom: 0.35rem; }
.tr-block p { margin: 0; text-align: left; color: rgba(16,33,30,0.88); }
.tr-swaps, .tr-q { list-style: none; display: grid; gap: 0.3rem; color: rgba(16,33,30,0.88); }
.tr-swaps li { display: flex; gap: 0.7rem; align-items: baseline; flex-wrap: wrap; }
.tr-swaps s { color: #c0392b; text-decoration-thickness: 2px; }
.tr-swaps b { color: #0a7c4a; font-weight: 700; }
.tr-swaps b::before { content: "→ "; color: rgba(16,33,30,0.45); }
.tr-q li::before { content: "? "; color: #0a7c6f; font-weight: 700; }
.tr-foot { font-family: "Special Elite", "Courier New", monospace; font-size: 0.68rem; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(16,33,30,0.5); text-align: left !important; line-height: 1.5; }

.tr-hint {
  position: absolute; left: 50%; top: 52%; z-index: 5; transform: translate(-50%, -50%);
  padding: 0.7rem 1.2rem; border-radius: 999px; background: #17130d; color: #f3ecd9;
  font-family: "Special Elite", "Courier New", monospace; font-size: 0.85rem; letter-spacing: 0.1em; text-transform: uppercase; white-space: nowrap;
  border: 1px solid rgba(255,176,32,0.6); pointer-events: none; transition: opacity 0.4s;
}
.tr-hint[data-hidden="true"] { opacity: 0; }

.tr-actions { display: flex; justify-content: center; margin-top: 2rem; }
.tr-btn {
  padding: 0.8rem 1.4rem; border: 1px solid #17130d; background: transparent; color: #17130d; cursor: pointer;
  font-family: "Special Elite", "Courier New", monospace; font-size: 0.8rem; letter-spacing: 0.12em; text-transform: uppercase;
}
.tr-btn:hover { background: #17130d; color: #f5f1e6; }
.tr-btn:focus-visible { outline: 2px solid #c77700; outline-offset: 3px; }
`;

export default function TrailReveal() {
  const stageRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(SVGLineElement | null)[]>([]);
  const filterRef = useRef<SVGFilterElement>(null);
  const turbRef = useRef<SVGFETurbulenceElement>(null);
  const [size, setSize] = useState({ w: 1000, h: 656 });
  const [pinned, setPinned] = useState(false);
  const [touched, setTouched] = useState(false);
  const input = useRef({ x: 0, y: 0, active: false, last: 0, inside: false });
  const headRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(() => {
      const r = stage.getBoundingClientRect();
      setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const noHover = window.matchMedia("(hover: none)").matches;

    const hist = Array.from({ length: N }, () => ({ x: size.w / 2, y: size.h / 2 }));
    const pos = { x: size.w / 2, y: size.h / 2 };
    const tgt = { x: pos.x, y: pos.y };
    let pace = 0;
    let sweepS = 0;
    let raf = 0;
    let visible = false;
    let t0 = performance.now();

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    });
    io.observe(stage);

    const frame = (now: number) => {
      raf = 0;
      if (!visible) return;
      const W = size.w, H = size.h;
      const inp = input.current;
      // idle sweep: always on touch devices, and on desktop until the visitor first moves
      const auto = !inp.active || (noHover && now - inp.last > 1500);
      if (auto) {
        sweepS += 0.0045;
        const seg = Math.floor(sweepS) % (SWEEP.length - 1);
        const f = sweepS - Math.floor(sweepS);
        const a = SWEEP[seg], b = SWEEP[seg + 1];
        tgt.x = ((a.x + (b.x - a.x) * f + 1) / 2) * W;
        tgt.y = ((a.y + (b.y - a.y) * f + 1) / 2) * H;
        if (Math.floor(sweepS) >= SWEEP.length - 1) sweepS = 0;
      } else {
        tgt.x = inp.x;
        tgt.y = inp.y;
      }
      const px = pos.x, py = pos.y;
      pos.x += (tgt.x - pos.x) * 0.17;
      pos.y += (tgt.y - pos.y) * 0.17;
      const d = Math.hypot(pos.x - px, pos.y - py);
      const peak = 0.0145 * W;
      const holding = !auto && inp.inside;
      const target = auto ? 0.78 : holding ? Math.max(0.8, Math.min(1, d / peak)) : Math.min(1, d / peak);
      pace += (target - pace) * (target > pace ? 0.09 + 0.1 : 0.205);
      const gate = holding ? 1 : smoothstep(0.06, 0.21, pace);

      hist.unshift({ x: pos.x, y: pos.y });
      hist.length = N;

      const baseR = Math.min(210, Math.max(95, W * 0.18));
      const R = baseR * (0.28 + 0.72 * pace);
      const taper = 3.0 - 1.75 * pace;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < N - 1; i++) {
        const line = lineRefs.current[i];
        if (!line) continue;
        const w = 2 * R * Math.pow(1 - i / (N - 1), taper) * gate;
        line.setAttribute("x1", String(hist[i].x));
        line.setAttribute("y1", String(hist[i].y));
        line.setAttribute("x2", String(hist[i + 1].x));
        line.setAttribute("y2", String(hist[i + 1].y));
        line.setAttribute("stroke-width", w.toFixed(1));
        if (w > 0.5) {
          minX = Math.min(minX, hist[i].x, hist[i + 1].x);
          maxX = Math.max(maxX, hist[i].x, hist[i + 1].x);
          minY = Math.min(minY, hist[i].y, hist[i + 1].y);
          maxY = Math.max(maxY, hist[i].y, hist[i + 1].y);
        }
      }
      const head = headRef.current;
      if (head) {
        head.setAttribute("cx", String(pos.x));
        head.setAttribute("cy", String(pos.y));
        head.setAttribute("r", (R * gate * 0.95).toFixed(1));
        if (gate > 0.02) {
          minX = Math.min(minX, pos.x);
          maxX = Math.max(maxX, pos.x);
          minY = Math.min(minY, pos.y);
          maxY = Math.max(maxY, pos.y);
        }
      }
      const f = filterRef.current;
      if (f) {
        const m = R + 80;
        if (minX === Infinity) {
          f.setAttribute("width", "1");
          f.setAttribute("height", "1");
        } else {
          f.setAttribute("x", String(Math.max(0, minX - m)));
          f.setAttribute("y", String(Math.max(0, minY - m)));
          f.setAttribute("width", String(Math.min(W, maxX - minX + m * 2)));
          f.setAttribute("height", String(Math.min(H, maxY - minY + m * 2)));
        }
      }
      const tb = turbRef.current;
      if (tb) {
        const t = (now - t0) / 1000;
        tb.setAttribute("baseFrequency", `${(0.018 + Math.sin(t * 0.7) * 0.003).toFixed(4)} ${(0.024 + Math.cos(t * 0.5) * 0.003).toFixed(4)}`);
      }
      // keep running while there is anything on screen or the cursor may move
      raf = requestAnimationFrame(frame);
    };
    t0 = performance.now();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [size.w, size.h]);

  const onMove = (e: React.PointerEvent) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return;
    const inp = input.current;
    inp.x = e.clientX - r.left;
    inp.y = e.clientY - r.top;
    inp.last = performance.now();
    if (!inp.active) {
      // start the trail from where the cursor entered
      inp.active = true;
    }
    if (!touched) setTouched(true);
  };

  const onEnter = (e: React.PointerEvent) => {
    input.current.inside = true;
    onMove(e);
  };
  const onLeave = () => {
    input.current.inside = false;
  };

  return (
    <section className="tr-section" aria-label="One article, two perspectives">
      <style>{css}</style>
      <div className="tr-intro">
        <p className="tr-eyebrow">Two ways to read one story</p>
        <h2 className="tr-title">
          Same article. <em>Without the spin.</em>
        </h2>
        <p className="tr-sub">
          Move your cursor over the front page. Where it is, and has just been, the story is rewritten the way it
          would read without loaded words, unsupported claims or fear.
        </p>
      </div>

      <div className="tr-stage" ref={stageRef} onPointerMove={onMove} onPointerDown={onMove} onPointerEnter={onEnter} onPointerLeave={onLeave} onPointerCancel={onLeave}>
        <FrontPage />
        <svg className="tr-overlay" width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`}>
          <defs>
            <filter
              id="tr-goo"
              ref={filterRef}
              filterUnits="userSpaceOnUse"
              x="0"
              y="0"
              width={size.w}
              height={size.h}
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="b" />
              <feTurbulence ref={turbRef} type="fractalNoise" baseFrequency="0.018 0.024" numOctaves="2" seed="4" result="n" />
              <feDisplacementMap in="b" in2="n" scale="48" xChannelSelector="R" yChannelSelector="G" result="d" />
              <feColorMatrix in="d" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -7" />
            </filter>
            <mask id="tr-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={size.w} height={size.h}>
              <rect width={size.w} height={size.h} fill="#000" />
              <g filter="url(#tr-goo)" stroke="#fff" strokeLinecap="round" fill="none">
                <circle ref={headRef} cx="0" cy="0" r="0" fill="#fff" stroke="none" />
                {Array.from({ length: N - 1 }, (_, i) => (
                  <line key={i} ref={(el) => { lineRefs.current[i] = el; }} x1="0" y1="0" x2="0" y2="0" strokeWidth="0" />
                ))}
              </g>
              <rect width={size.w} height={size.h} fill="#fff" style={{ opacity: pinned ? 1 : 0, transition: "opacity 0.6s" }} />
            </mask>
          </defs>
          <foreignObject x="0" y="0" width={size.w} height={size.h} mask="url(#tr-mask)">
            <div style={{ width: size.w, height: size.h }}>
              <BackPage />
            </div>
          </foreignObject>
        </svg>
        <div className="tr-hint" data-hidden={touched} aria-hidden="true">
          Move across the page to rewrite it
        </div>
      </div>

      <div className="tr-actions">
        <button type="button" className="tr-btn" aria-pressed={pinned} onClick={() => setPinned((v) => !v)}>
          {pinned ? "Hide the second perspective" : "Show the full second perspective"}
        </button>
      </div>
    </section>
  );
}
export { TrailReveal as Component };

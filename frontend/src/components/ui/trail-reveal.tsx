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
      <div className="tr-stamp-red" aria-hidden="true">Case No. 4471</div>
      <header className="tr-mast">
        <span className="tr-masthead">The Northgate Courier</span>
        <span className="tr-dateline">Tue 21 Nov 2026 · Crime &amp; City · 25¢</span>
      </header>
      <div className="tr-rule" />
      <p className="tr-kicker">Exclusive — Commuters Left Footing the Bill</p>
      <h3 className="tr-headline">Congestion Charge Chokes Manhattan as Drivers Pay and Small Firms Brace</h3>
      <div className="tr-byline">
        <span>By our Crime &amp; City Desk</span>
        <span>Council silent</span>
      </div>
      <div className="tr-cols">
        <figure className="tr-figure">
          <div className="tr-photo">
            <img src="/photos/holland-tunnel-1973.jpg" alt="Trucks and cars crowding a Canal Street intersection near the Holland Tunnel, 1973" loading="eager" decoding="async" />
            <span className="tr-tag">Exhibit A</span>
          </div>
          <figcaption>Trucks jam Canal St. near the Holland Tunnel, 1973. Photo: Wil Blanche / U.S. National Archives (public domain)</figcaption>
        </figure>
        <p>
          Drivers heading into Manhattan&apos;s core now pay a $9 peak-hour charge to sit in the same
          traffic, and critics say outer-borough commuters with few transit options are paying the most.
          Small-business owners warn that deliveries and customers will simply go elsewhere.
        </p>
        <p>
          Opponents, including officials across the river in New Jersey, have fought the plan in court,
          calling it a cash grab dressed up as clean-air policy. The relief promised to riders, they say,
          is unproven.
        </p>
        <p className="tr-sm-hide">
          No one can say how long the charge will stay at nine dollars. Questions about where every dollar
          goes remain unanswered.
        </p>
      </div>
    </div>
  );
}

function BackPage() {
  return (
    <div className="tr-page tr-back">
      <header className="tr-mast">
        <span className="tr-masthead">The Northgate Dispatch</span>
        <span className="tr-dateline">A brighter reading · same story</span>
      </header>
      <div className="tr-rule" />
      <p className="tr-kicker">Early figures, fresh air</p>
      <h3 className="tr-headline">Manhattan Breathes Easier as Traffic Thins and Transit Gets a Boost</h3>
      <div className="tr-byline">
        <span>The other side of the charge</span>
        <span>Reviews still ongoing</span>
      </div>
      <div className="tr-cols">
        <figure className="tr-figure">
          <img className="tr-art" src="/photos/fifth-avenue-bus-lane.jpg" alt="A cyclist rides in a red bus lane on Fifth Avenue in Manhattan as pedestrians walk beneath trees" loading="eager" decoding="async" />
          <figcaption>A dedicated bus lane on Fifth Avenue, 2018. Photo: Tdorante10, CC BY-SA 4.0</figcaption>
        </figure>
        <p>
          Since the charge began in January 2025, early transit-agency figures point to noticeably fewer
          vehicles entering the zone, and riders on several bus routes report quicker trips. The money is
          earmarked for subway and bus upgrades, the first time many riders will see it come back to them.
        </p>
        <ul className="tr-stats">
          <li><b>≈ −10%</b> vehicles entering the zone</li>
          <li><b>$9</b> peak charge for cars</li>
          <li><b>100%</b> of net revenue to transit</li>
        </ul>
        <p className="tr-sm-hide">
          Some drivers and shop owners still say the cost is real, and legal challenges continue. Both
          sides agree on one thing: the results should be public.
        </p>
        <p className="tr-foot">Paraphrased summaries of public debate · not real newspaper text · verify figures</p>
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
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding: 2.2rem 2.6rem;
  line-height: 1.65;
  clip-path: polygon(0 0.6%, 8% 0, 17% 0.7%, 30% 0.1%, 44% 0.8%, 58% 0, 72% 0.7%, 86% 0.1%, 100% 0.6%, 99.6% 30%, 100% 62%, 99.5% 100%, 90% 99.4%, 76% 100%, 62% 99.3%, 48% 100%, 33% 99.4%, 19% 100%, 8% 99.3%, 0 100%, 0.4% 64%, 0 33%);
}

/* ---------- upper layer: yellowed, dreadful, crime-file ---------- */
.tr-front {
  color: #1b1208;
  font-family: "Special Elite", "Courier New", monospace;
  background-color: #c9ad5e;
  background-image:
    radial-gradient(ellipse 45% 30% at 12% 8%, rgba(110, 60, 10, 0.4), transparent 70%),
    radial-gradient(ellipse 30% 22% at 90% 96%, rgba(90, 45, 5, 0.45), transparent 70%),
    radial-gradient(circle at 80% 70%, transparent 0 2.1rem, rgba(100, 55, 10, 0.4) 2.15rem 2.45rem, transparent 2.55rem),
    radial-gradient(ellipse at 50% 50%, transparent 38%, rgba(50, 25, 3, 0.62) 100%),
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.3  0 0 0 0 0.18  0 0 0 0 0.04  0 0 0 0.42 0'/></filter><rect width='180' height='180' filter='url(%23n)'/></svg>"),
    linear-gradient(165deg, #dcc275, #b8964a);
}
.tr-front::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(0deg, rgba(0,0,0,0.04) 0 1px, transparent 1px 3px);
  mix-blend-mode: multiply;
}
.tr-front .tr-masthead {
  font-family: "Playfair Display", Georgia, serif;
  font-weight: 900;
  font-style: normal;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  font-size: clamp(1.2rem, 3vw, 2rem);
  color: #120a03;
}
.tr-front .tr-dateline { color: #3a2610; opacity: 0.85; }
.tr-front .tr-rule { border-color: #2a1a08; opacity: 0.9; }
.tr-front .tr-kicker {
  display: inline-block;
  padding: 0.1rem 0.6rem;
  background: #1b1208;
  color: #e8d48f;
  font-size: 0.74rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 0.6rem;
}
.tr-front .tr-headline {
  font-family: "Playfair Display", Georgia, serif;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.015em;
  line-height: 1.05;
  font-size: clamp(1.5rem, 3.8vw, 2.7rem);
  color: #120a03;
  text-shadow: 1px 1px 0 rgba(255, 230, 150, 0.25);
}
.tr-front .tr-byline { color: #3a2610; border-color: #2a1a08; }
.tr-front .tr-cols p { text-align: left; color: #1b1208; }
.tr-front .tr-photo {
  position: relative;
  border: 3px solid #1b1208;
  background: #3a2a0c;
  overflow: hidden;
  -webkit-mask-image: none;
  mask-image: none;
  box-shadow: inset 0 0 2.2rem rgba(0,0,0,0.65);
}
.tr-front .tr-photo img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 45% 55%;
  filter: sepia(1) saturate(0.8) contrast(1.25) brightness(0.95);
  mix-blend-mode: multiply;
}
.tr-front .tr-photo { box-shadow: inset 0 0 3rem rgba(10,5,0,0.85); }
.tr-front .tr-photo::after {
  content: "";
  position: absolute;
  left: 52%; top: 28%;
  width: 3.4rem; height: 3.4rem;
  border: 3px solid #b3261e;
  border-radius: 50%;
  transform: rotate(-8deg);
}
.tr-tag {
  position: absolute;
  left: 0.5rem; top: 0.5rem;
  padding: 0.15rem 0.6rem;
  background: #efe0a6;
  color: #1b1208;
  border: 1px solid #1b1208;
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  transform: rotate(-4deg);
  z-index: 2;
}
.tr-stamp-red {
  position: absolute;
  right: 1.6rem;
  top: 5.6rem;
  z-index: 3;
  padding: 0.2rem 0.8rem;
  border: 3px solid #a31f17;
  color: #a31f17;
  font-size: clamp(0.8rem, 1.6vw, 1.05rem);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  transform: rotate(7deg);
  opacity: 0.85;
  mix-blend-mode: multiply;
}
.tr-front .tr-figure figcaption { color: #3a2610; opacity: 0.9; }

/* ---------- lower layer: bright, hopeful ---------- */
.tr-back {
  color: #14304a;
  font-family: "Playfair Display", Georgia, serif;
  background-color: #fffbe8;
  background-image:
    radial-gradient(circle at 92% 4%, rgba(255, 207, 74, 0.85), transparent 42%),
    radial-gradient(ellipse at 8% 100%, rgba(120, 220, 190, 0.45), transparent 55%),
    linear-gradient(180deg, #fffef6 0%, #fff6cf 60%, #e4f7ef 100%);
}
.tr-back .tr-masthead {
  font-style: italic;
  font-weight: 800;
  color: #0b8a72;
  font-size: clamp(1.4rem, 3.4vw, 2.3rem);
}
.tr-back .tr-dateline { color: #14304a; opacity: 0.65; }
.tr-back .tr-rule { border-color: #0b8a72; opacity: 0.55; }
.tr-back .tr-kicker {
  display: inline-block;
  padding: 0.12rem 0.7rem;
  border-radius: 999px;
  background: #ffd75a;
  color: #4a3600;
  font-family: "Special Elite", "Courier New", monospace;
  font-size: 0.74rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin-bottom: 0.6rem;
}
.tr-back .tr-headline { font-weight: 900; color: #0f2c47; font-size: clamp(1.5rem, 3.8vw, 2.7rem); line-height: 1.1; }
.tr-back .tr-byline { color: #14304a; border-color: rgba(11,138,114,0.45); opacity: 0.8; }
.tr-back .tr-cols p { text-align: left; color: #1d3d57; }
.tr-art { display: block; width: 100%; height: 11rem; object-fit: cover; object-position: 50% 62%; border-radius: 0.6rem; box-shadow: 0 0.4rem 1rem rgba(20,48,74,0.18); filter: saturate(1.2) brightness(1.08) contrast(1.02); }
.tr-back .tr-figure figcaption { color: #14304a; opacity: 0.7; }
.tr-stats { list-style: none; display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0 0 1rem; break-inside: avoid-column; }
.tr-stats li {
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: #d9f4e8;
  color: #0b5e4e;
  font-family: "Special Elite", "Courier New", monospace;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
}
.tr-stats b { font-family: "Playfair Display", Georgia, serif; font-size: 1rem; margin-right: 0.25rem; }
.tr-back .tr-foot { color: rgba(20,48,74,0.5); }

/* ---------- shared ---------- */
.tr-mast { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; line-height: 1.2; }
.tr-dateline { font-family: "Special Elite", "Courier New", monospace; font-size: clamp(0.58rem, 1.2vw, 0.76rem); letter-spacing: 0.08em; text-transform: uppercase; text-align: right; }
.tr-rule { height: 0.28rem; margin: 0.8rem 0 1.1rem; border-top: 2px solid currentColor; border-bottom: 1px solid currentColor; }
.tr-byline { display: flex; justify-content: space-between; gap: 1rem; margin: 0.9rem 0 1.2rem; padding-bottom: 0.7rem; border-bottom: 1px solid currentColor; font-family: "Special Elite", "Courier New", monospace; font-size: 0.74rem; letter-spacing: 0.08em; text-transform: uppercase; }
.tr-cols { column-count: 2; column-gap: 2.4rem; font-size: clamp(0.86rem, 1.35vw, 1rem); }
.tr-cols p { margin: 0 0 1rem; break-inside: avoid-column; }
.tr-figure { margin: 0 0 1rem; break-inside: avoid-column; }
.tr-photo { height: 11rem; }
.tr-figure figcaption { margin-top: 0.4rem; font-family: "Special Elite", "Courier New", monospace; font-size: 0.7rem; line-height: 1.3; }
.tr-foot { font-family: "Special Elite", "Courier New", monospace; font-size: 0.66rem; letter-spacing: 0.06em; text-transform: uppercase; line-height: 1.5; text-align: left !important; }
@media (max-width: 760px) { .tr-cols { column-count: 1; } .tr-page { padding: 1.4rem 1.2rem; } .tr-sm-hide { display: none; } .tr-photo, .tr-art { height: 5.5rem; } .tr-stamp-red { top: 4.6rem; } }

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
          Same story. <em>Other side.</em>
        </h2>
        <p className="tr-sub">
          Move your cursor over the front page. Wherever it goes, the same story is told from the other side:
          still sourced, but without the dread.
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
          Move across the page to see the other side
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

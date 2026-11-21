"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Globe } from "lucide-react";

type Theme = "dark" | "sand" | "light" | "slate";
type Segment = { t: string; flag?: boolean };

interface NewsCard {
  outlet: string;
  time: string;
  headline: Segment[];
  technique: string;
  neutral: string;
  score: number;
  theme: Theme;
}

const NEWS: NewsCard[] = [
  {
    outlet: "Daily Ledger",
    time: "2h ago",
    headline: [
      { t: "Council " },
      { t: "slams reckless", flag: true },
      { t: " transit plan" },
    ],
    technique: "Loaded language",
    neutral: "Council criticizes new transit plan",
    score: 72,
    theme: "dark",
  },
  {
    outlet: "Metro Wire",
    time: "3h ago",
    headline: [{ t: "City proposes 12 new bus routes at a cost of $40 million" }],
    technique: "No manipulation found",
    neutral: "Already neutral",
    score: 12,
    theme: "light",
  },
  {
    outlet: "The Frontline",
    time: "4h ago",
    headline: [
      { t: "Rate hold " },
      { t: "will crush", flag: true },
      { t: " middle-class families" },
    ],
    technique: "Fear appeal",
    neutral: "Rate hold may affect household budgets",
    score: 81,
    theme: "sand",
  },
  {
    outlet: "Global Dispatch",
    time: "5h ago",
    headline: [
      { t: "Experts " },
      { t: "agree", flag: true },
      { t: " new vaccine policy is a disaster" },
    ],
    technique: "Bandwagon",
    neutral: "Some experts criticize vaccine policy",
    score: 68,
    theme: "slate",
  },
  {
    outlet: "Bharat Today",
    time: "6h ago",
    headline: [
      { t: "Budget " },
      { t: "betrays", flag: true },
      { t: " farmers, again" },
    ],
    technique: "Emotional appeal",
    neutral: "Budget allocation for farmers unchanged",
    score: 77,
    theme: "dark",
  },
  {
    outlet: "Tech Chronicle",
    time: "7h ago",
    headline: [
      { t: "AI chip ban: " },
      { t: "it's us or them", flag: true },
    ],
    technique: "False dichotomy",
    neutral: "Government weighs export limits on AI chips",
    score: 74,
    theme: "light",
  },
  {
    outlet: "Morning Post",
    time: "8h ago",
    headline: [
      { t: "Study shows " },
      { t: "huge", flag: true },
      { t: " drop in crime after policy" },
    ],
    technique: "Cherry-picking",
    neutral: "Crime fell 4% in two of six districts",
    score: 63,
    theme: "sand",
  },
  {
    outlet: "Reuters Wire",
    time: "9h ago",
    headline: [{ t: "Central bank holds rate at 6.5% for fourth straight meeting" }],
    technique: "No manipulation found",
    neutral: "Already neutral",
    score: 8,
    theme: "slate",
  },
  {
    outlet: "Evening Standard",
    time: "10h ago",
    headline: [
      { t: "Mayor " },
      { t: "refuses to answer", flag: true },
      { t: " on stadium deal" },
    ],
    technique: "Unsupported claim",
    neutral: "Mayor's office has not commented on stadium deal",
    score: 58,
    theme: "dark",
  },
  {
    outlet: "World Report",
    time: "11h ago",
    headline: [
      { t: "Migrants " },
      { t: "flood", flag: true },
      { t: " border towns" },
    ],
    technique: "Loaded language",
    neutral: "Arrivals at border towns rise 18%",
    score: 79,
    theme: "light",
  },
  {
    outlet: "Sports Desk",
    time: "12h ago",
    headline: [
      { t: "Captain's " },
      { t: "shameful", flag: true },
      { t: " collapse costs India the series" },
    ],
    technique: "Emotional appeal",
    neutral: "India lose series 2-1 after batting collapse",
    score: 55,
    theme: "sand",
  },
  {
    outlet: "Science Weekly",
    time: "13h ago",
    headline: [
      { t: "New study: coffee " },
      { t: "cures", flag: true },
      { t: " memory loss" },
    ],
    technique: "Unsupported claim",
    neutral: "Small study links coffee to slower memory decline",
    score: 66,
    theme: "slate",
  },
];

const TOTAL = NEWS.length;
const Z_FAR = -2400;
const Z_NEAR = 780;
const RANGE = Z_NEAR - Z_FAR;
const DURATION = 16;
const FADE_IN = 0.06;
const FADE_OUT = 0.04;

const css = `
.endless-root,
.endless-root *,
.endless-root *::before,
.endless-root *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.endless-root {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: #000000;
  color: #ffffff;
  font-family: inherit;
  user-select: none;
  pointer-events: none;
}

.endless-root .endless-scene {
  position: absolute;
  inset: 0;
  -webkit-perspective: 1100px;
  perspective: 1100px;
  -webkit-perspective-origin: 50% 50%;
  perspective-origin: 50% 50%;
  -webkit-transform-style: preserve-3d;
  transform-style: preserve-3d;
}

.endless-root .endless-world {
  position: absolute;
  inset: 0;
  -webkit-transform: translate3d(0, 0, 0);
  transform: translate3d(0, 0, 0);
  -webkit-transform-style: preserve-3d;
  transform-style: preserve-3d;
}

.endless-root .endless-plane {
  position: absolute;
  top: 50%;
  left: 50%;
  background-color: #000000;
  -webkit-transform-style: preserve-3d;
  transform-style: preserve-3d;
  transform-origin: 50% 50%;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  will-change: transform;
  container-type: inline-size;
}

/* ---- news clipping card ---- */
.endless-root .endless-card {
  position: relative;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 1.6cqw 2.4cqw rgba(0,0,0,0.65));
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
}
.endless-root .paper {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 6.5cqw 6.5cqw 5.5cqw;
  overflow: hidden;
  color: #17130d;
  --ink: #17130d;
  --muted: rgba(23,19,13,0.58);
  --rule: rgba(23,19,13,0.75);
  background-image:
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.15  0 0 0 0.16 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>"),
    linear-gradient(115deg, rgba(255,255,255,0.35), rgba(0,0,0,0.06) 70%);
}
.endless-root .theme-dark  { background-color: #f0e8d4; }
.endless-root .theme-sand  { background-color: #e4d2a4; }
.endless-root .theme-light { background-color: #f3f0e9; }
.endless-root .theme-slate { background-color: #d9d5cb; }

.endless-root .clip-0 { clip-path: polygon(0 1.4%, 7% 0, 15% 1.2%, 27% 0.2%, 40% 1.5%, 54% 0, 67% 1.1%, 81% 0.2%, 93% 1.3%, 100% 0.3%, 99.2% 28%, 100% 52%, 99.3% 78%, 100% 97%, 91% 99.2%, 79% 100%, 65% 98.7%, 51% 100%, 37% 99%, 23% 100%, 11% 98.8%, 0 100%, 0.8% 72%, 0 44%, 0.7% 20%); }
.endless-root .clip-1 { clip-path: polygon(0 0.5%, 10% 1.4%, 21% 0, 34% 1.1%, 47% 0.2%, 61% 1.5%, 74% 0, 88% 1.2%, 100% 0, 99% 24%, 100% 49%, 98.9% 75%, 100% 100%, 88% 98.9%, 75% 100%, 60% 99%, 46% 100%, 33% 98.7%, 19% 100%, 8% 99%, 0 99.5%, 0.9% 74%, 0 50%, 1% 26%); }
.endless-root .clip-2 { clip-path: polygon(1% 0, 13% 1.2%, 25% 0.1%, 39% 1.3%, 52% 0, 66% 1.2%, 79% 0.1%, 91% 1.4%, 100% 0.6%, 99.2% 33%, 100% 60%, 99% 85%, 100% 99%, 92% 98.8%, 80% 100%, 66% 99%, 53% 100%, 38% 98.8%, 24% 100%, 12% 99%, 0 100%, 1% 68%, 0 41%, 0.8% 16%); }

.endless-root .paper-tape {
  position: absolute;
  top: -1.2cqw;
  left: 50%;
  width: 24cqw;
  height: 7cqw;
  transform: translateX(-50%) rotate(-3deg);
  background: rgba(238, 218, 150, 0.62);
  box-shadow: 0 0 1cqw rgba(0,0,0,0.15);
  z-index: 3;
}

.endless-root .paper-mast {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 2cqw;
  padding-bottom: 1.6cqw;
  border-bottom: 0.5cqw solid var(--rule);
  box-shadow: 0 1.1cqw 0 -0.6cqw var(--paper-bg, transparent), 0 1.2cqw 0 -0.2cqw transparent;
}
.endless-root .paper-outlet {
  font-family: "Playfair Display", Georgia, serif;
  font-style: italic;
  font-weight: 800;
  font-size: 6.6cqw;
  letter-spacing: -0.01em;
  white-space: nowrap;
}
.endless-root .paper-time {
  font-family: "Special Elite", "Courier New", monospace;
  font-size: 3.4cqw;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  white-space: nowrap;
}
.endless-root .paper-rule {
  height: 0.35cqw;
  margin: 1cqw 0 3.6cqw;
  background: var(--rule);
}
.endless-root .paper-headline {
  font-family: "Playfair Display", Georgia, serif;
  font-weight: 900;
  font-size: 9.6cqw;
  line-height: 1.06;
  letter-spacing: -0.02em;
}
.endless-root .paper-headline mark {
  color: inherit;
  padding: 0 0.6cqw;
  background: linear-gradient(180deg, transparent 8%, rgba(255,176,32,0.95) 8%, rgba(255,176,32,0.95) 92%, transparent 92%);
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
  transform: rotate(-0.6deg);
  display: inline;
}
.endless-root .paper-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3.4cqw;
  margin-top: 4cqw;
  flex: 1;
  min-height: 0;
}
.endless-root .paper-photo {
  position: relative;
  border: 0.4cqw solid var(--rule);
  background:
    radial-gradient(circle at 50% 50%, rgba(23,19,13,0.88) 30%, transparent 33%) 0 0 / 1.7cqw 1.7cqw,
    #cfc8b6;
  -webkit-mask-image: radial-gradient(ellipse 90% 90% at 40% 45%, #000 20%, rgba(0,0,0,0.25) 85%);
  mask-image: radial-gradient(ellipse 90% 90% at 40% 45%, #000 20%, rgba(0,0,0,0.25) 85%);
}
.endless-root .paper-lines {
  background: repeating-linear-gradient(180deg, rgba(23,19,13,0.55) 0 0.55cqw, transparent 0.55cqw 2.5cqw);
  -webkit-mask-image: linear-gradient(180deg, #000 55%, transparent);
  mask-image: linear-gradient(180deg, #000 55%, transparent);
}
.endless-root .paper-note {
  position: relative;
  margin-top: 3.4cqw;
  padding: 2.6cqw 3.2cqw 2.8cqw;
  background: rgba(255,255,255,0.55);
  border: 0.35cqw dashed var(--rule);
  font-family: "Special Elite", "Courier New", monospace;
  font-size: 3.9cqw;
  line-height: 1.3;
}
.endless-root .paper-note b {
  display: block;
  font-size: 3cqw;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #b4231a;
  margin-bottom: 0.8cqw;
}
.endless-root .paper-foot {
  display: flex;
  align-items: center;
  gap: 2.6cqw;
  margin-top: 3cqw;
  font-family: "Special Elite", "Courier New", monospace;
  font-size: 3.2cqw;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.endless-root .paper-foot i {
  position: relative;
  flex: 1;
  height: 1.3cqw;
  border: 0.3cqw solid var(--rule);
}
.endless-root .paper-foot i span {
  position: absolute;
  inset: 0 auto 0 0;
  background: #17130d;
}
.endless-root .paper-stamp {
  position: absolute;
  right: 5cqw;
  top: 66cqw;
  z-index: 4;
  padding: 1.2cqw 2.6cqw;
  border: 0.8cqw solid #c62a1e;
  border-radius: 1.2cqw;
  color: #c62a1e;
  font-family: "Special Elite", "Courier New", monospace;
  font-weight: 700;
  font-size: 4.6cqw;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1.1;
  text-align: center;
  background: rgba(240,232,212,0.55);
  transform: rotate(-9deg);
  mix-blend-mode: multiply;
  opacity: 0.92;
}
.endless-root .paper-stamp small { display: block; font-size: 3cqw; letter-spacing: 0.2em; }
.endless-root .paper-stamp.ok { border-color: #1f7a4d; color: #1f7a4d; }

/* ---- news background ---- */
.endless-root .news-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background:
    radial-gradient(ellipse 60% 55% at 50% 50%, rgba(255, 176, 32, 0.13), transparent 70%),
    radial-gradient(ellipse 80% 70% at 50% 50%, #0d0d0f 0%, #000 100%);
}
.endless-root .news-bg::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 3px);
  pointer-events: none;
}
.endless-root .news-cols {
  position: absolute;
  inset: 2.6rem 0 0 0;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 2.2rem;
  padding: 0 2.2rem;
  -webkit-mask-image: radial-gradient(ellipse 70% 75% at 50% 50%, transparent 18%, #000 90%);
  mask-image: radial-gradient(ellipse 70% 75% at 50% 50%, transparent 18%, #000 90%);
}
@media (max-width: 767px) {
  .endless-root .news-cols { grid-template-columns: repeat(3, 1fr); gap: 1rem; padding: 0 1rem; }
  .endless-root .news-col:nth-child(n+4) { display: none; }
}
.endless-root .news-col { overflow: hidden; border-left: 1px solid rgba(255,255,255,0.06); padding-left: 0.9rem; }
.endless-root .news-col-inner {
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  animation: news-scroll-up var(--dur, 60s) linear infinite;
}
.endless-root .news-col.down .news-col-inner { animation-name: news-scroll-down; }
@keyframes news-scroll-up { from { transform: translateY(0); } to { transform: translateY(-50%); } }
@keyframes news-scroll-down { from { transform: translateY(-50%); } to { transform: translateY(0); } }
.endless-root .news-item { color: rgba(255,255,255,0.13); }
.endless-root .news-item small {
  display: block;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.3);
  margin-bottom: 0.35rem;
  border-top: 2px solid rgba(255,255,255,0.12);
  padding-top: 0.5rem;
}
.endless-root .news-item p {
  font-family: "Playfair Display", Georgia, serif;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.2;
}
.endless-root .news-item em {
  font-style: normal;
  color: rgba(255,176,32,0.4);
  background: rgba(255,176,32,0.1);
}

.endless-root .news-ticker {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  height: 2.2rem;
  background: rgba(10,10,12,0.92);
  border-bottom: 1px solid rgba(255,255,255,0.1);
  overflow: hidden;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.endless-root .news-live {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  height: 100%;
  padding: 0 0.9rem;
  background: #d92d20;
  color: #fff;
  flex-shrink: 0;
  z-index: 2;
}
.endless-root .news-live::before {
  content: "";
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: #fff;
  animation: news-blink 1.2s ease-in-out infinite;
}
@keyframes news-blink { 50% { opacity: 0.2; } }
.endless-root .news-ticker-track {
  display: flex;
  white-space: nowrap;
  animation: news-scroll-left 70s linear infinite;
  color: rgba(255,255,255,0.7);
}
.endless-root .news-ticker-track span { padding: 0 1.6rem; }
.endless-root .news-ticker-track span::after { content: "◆"; margin-left: 3.2rem; color: #ffb020; }
.endless-root .news-ticker-track em { font-style: normal; color: #ffb020; }
@keyframes news-scroll-left { from { transform: translateX(0); } to { transform: translateX(-50%); } }

@media (prefers-reduced-motion: reduce) {
  .endless-root .news-col-inner, .endless-root .news-ticker-track { animation: none; }
}

.endless-root .endless-title {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 50;
  transform: translate(-50%, -50%);
  color: #f3ecd9;
  font-family: "Playfair Display", Georgia, serif;
  font-style: italic;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  line-height: 1.15;
  text-align: center;
  white-space: nowrap;
}

@media (min-width: 768px) {
  .endless-root .endless-title {
    font-size: 1.75rem;
  }
}

@media (min-width: 1200px) {
  .endless-root .endless-title {
    font-size: 2.5rem;
  }
}

.endless-root .endless-title span {
  display: block;
  color: #ffb020;
}

.endless-root .endless-footer {
  position: absolute;
  bottom: 2.5rem;
  left: 50%;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  transform: translateX(-50%);
  color: #707070;
}

@media (min-width: 768px) {
  .endless-root .endless-footer {
    bottom: 2rem;
  }
}

.endless-root .endless-globe {
  display: block;
  flex-shrink: 0;
}

.endless-root .endless-caption {
  color: #707070;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  line-height: 1.3;
  text-align: center;
  white-space: nowrap;
}

/* iOS WebKit flattens nested 3D when an ancestor uses overflow: hidden. */
@supports (-webkit-touch-callout: none) {
  .endless-root {
    overflow: visible;
    -webkit-clip-path: inset(0);
    clip-path: inset(0);
  }
}
`;

function opacityForProgress(progress: number) {
  if (progress < FADE_IN) return Math.max(0, progress / FADE_IN);
  if (progress > 1 - FADE_OUT) return Math.max(0, (1 - progress) / FADE_OUT);
  return 1;
}

function getLayout() {
  const width = window.innerWidth;
  const planeW = width < 768 ? Math.min(width * 0.26, 200) : Math.min(width * 0.26, 440);
  return {
    planeW,
    planeH: planeW * (4 / 3),
    offsetX: width * 0.33,
    angle: 24,
  };
}

export default function Endless() {
  const worldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;

    const planes = Array.from(world.querySelectorAll<HTMLElement>(".endless-plane"));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tweens: gsap.core.Tween[] = [];

    gsap.ticker.lagSmoothing(0);
    gsap.set(world, { force3D: true });

    const applyLayout = () => {
      const { planeW, planeH, offsetX, angle } = getLayout();
      planes.forEach((plane, index) => {
        const isLeft = index % 2 === 0;
        plane.style.width = `${planeW}px`;
        plane.style.height = `${planeH}px`;
        gsap.set(plane, {
          xPercent: -50,
          yPercent: -50,
          x: isLeft ? -offsetX : offsetX,
          y: 0,
          rotationY: isLeft ? angle : -angle,
          force3D: true,
        });
      });
    };

    applyLayout();

    planes.forEach((plane, index) => {
      const card = plane.querySelector(".endless-card") as HTMLElement;
      const startProgress = index / TOTAL;

      gsap.set(plane, { z: Z_FAR + startProgress * RANGE });
      card.style.opacity = String(opacityForProgress(startProgress));
      plane.style.zIndex = String(Math.round(startProgress * 1000));

      if (reduceMotion) return;

      const tween = gsap.fromTo(
        plane,
        { z: Z_FAR },
        {
          z: Z_NEAR,
          duration: DURATION,
          ease: "none",
          repeat: -1,
          immediateRender: false,
          onUpdate() {
            const progress = this.progress();
            card.style.opacity = String(opacityForProgress(progress));
            plane.style.zIndex = String(Math.round(progress * 1000));
          },
        },
      );

      tween.progress(startProgress);
      tweens.push(tween);
    });

    window.addEventListener("resize", applyLayout);

    return () => {
      window.removeEventListener("resize", applyLayout);
      tweens.forEach((tween) => tween.kill());
      gsap.killTweensOf(planes);
    };
  }, []);

  return (
    <section className="endless-root" aria-label="News articles flowing past, with manipulation flagged">
      <style>{css}</style>
      <div className="news-bg" aria-hidden="true">
        <div className="news-cols">
          {[0, 1, 2, 3, 4, 5].map((c) => {
            const items = [...NEWS.slice(c * 2), ...NEWS.slice(0, c * 2)];
            const list = [...items, ...items];
            return (
              <div className={`news-col ${c % 2 ? "down" : ""}`} key={c}>
                <div className="news-col-inner" style={{ ["--dur" as string]: `${55 + c * 9}s` }}>
                  {list.map((n, i) => (
                    <div className="news-item" key={i}>
                      <small>
                        {n.outlet} · {n.time}
                      </small>
                      <p>
                        {n.headline.map((s, j) => (s.flag ? <em key={j}>{s.t}</em> : <span key={j}>{s.t}</span>))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="news-ticker" aria-hidden="true">
        <div className="news-live">Live</div>
        <div className="news-ticker-track">
          {[...NEWS, ...NEWS].map((n, i) => (
            <span key={i}>
              <em>{n.technique}</em> · {n.headline.map((s) => s.t).join("")}
            </span>
          ))}
        </div>
      </div>
      <div className="endless-scene">
        <div className="endless-world" ref={worldRef}>
          {NEWS.map((n, idx) => (
            <div className="endless-plane" key={n.headline.map((s) => s.t).join("")}>
              <div className="endless-card">
                <article
                  className={`paper theme-${n.theme} clip-${idx % 3}`}
                  style={{ transform: `rotate(${((idx * 37) % 7) / 3 - 1}deg)` }}
                >
                  {idx % 2 === 0 && <span className="paper-tape" aria-hidden="true" />}
                  <header className="paper-mast">
                    <span className="paper-outlet">{n.outlet}</span>
                    <span className="paper-time">{n.time}</span>
                  </header>
                  <div className="paper-rule" />
                  <h2 className="paper-headline">
                    {n.headline.map((s, i) =>
                      s.flag ? <mark key={i}>{s.t}</mark> : <span key={i}>{s.t}</span>,
                    )}
                  </h2>
                  <div className="paper-body">
                    <div className="paper-photo" />
                    <div className="paper-lines" />
                  </div>
                  <div className="paper-note">
                    <b>{n.score < 20 ? "Verdict" : "Corrected"}</b>
                    {n.neutral}
                  </div>
                  <div className="paper-foot">
                    <span>Bias</span>
                    <i>
                      <span style={{ width: `${n.score}%` }} />
                    </i>
                    <span>{n.score}</span>
                  </div>
                  <div className={`paper-stamp ${n.score < 20 ? "ok" : ""}`}>
                    {n.score < 20 ? "Clean" : n.technique}
                    <small>{n.score < 20 ? "no spin found" : "flagged"}</small>
                  </div>
                </article>
              </div>
            </div>
          ))}
        </div>
      </div>
      <h1 className="endless-title">
        Read between
        <span>the lines</span>
      </h1>
      <div className="endless-footer">
        <Globe className="endless-globe" size={24} strokeWidth={1} aria-hidden="true" />
        <p className="endless-caption">See exactly how the news is trying to influence you</p>
      </div>
    </section>
  );
}
export { Endless as Component };

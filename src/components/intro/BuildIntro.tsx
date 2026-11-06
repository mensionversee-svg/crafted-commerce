import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Check, Sparkles } from "lucide-react";

/**
 * Self-contained "designers are building the site" intro.
 * Purely visual: renders its own mock sections and never touches store state.
 */

type SectionId = "nav" | "hero" | "cats" | "products" | "banner" | "footer";
const SECTIONS: SectionId[] = ["nav", "hero", "cats", "products", "banner", "footer"];

type Cursor = { id: string; name: string; color: string };
const CURSORS: Cursor[] = [
  { id: "ava", name: "Ava", color: "var(--cursor-1)" },
  { id: "leo", name: "Leo", color: "var(--cursor-2)" },
  { id: "mina", name: "Mina", color: "var(--cursor-3)" },
  { id: "kai", name: "Kai", color: "var(--cursor-4)" },
];

type Action = "click" | "drag" | "type" | "select" | "idle";
type Target = { x: number; y: number; action: Action };
// Per step: where each cursor goes (relative to the active section box)
const PLAN: Record<SectionId, Record<string, Target>> = {
  nav: { ava: { x: 0.08, y: 0.5, action: "type" }, leo: { x: 0.45, y: 0.5, action: "click" }, mina: { x: 0.9, y: 0.5, action: "click" }, kai: { x: 0.65, y: 1.6, action: "idle" } },
  hero: { ava: { x: 0.25, y: 0.38, action: "type" }, leo: { x: 0.3, y: 0.72, action: "click" }, mina: { x: 0.72, y: 0.5, action: "drag" }, kai: { x: 0.98, y: 0.02, action: "select" } },
  cats: { ava: { x: 0.12, y: 0.6, action: "click" }, leo: { x: 0.38, y: 0.6, action: "click" }, mina: { x: 0.62, y: 0.6, action: "click" }, kai: { x: 0.88, y: 0.6, action: "click" } },
  products: { ava: { x: 0.2, y: 0.12, action: "type" }, leo: { x: 0.35, y: 0.6, action: "drag" }, mina: { x: 0.85, y: 0.6, action: "drag" }, kai: { x: 0.6, y: 0.9, action: "select" } },
  banner: { ava: { x: 0.3, y: 0.45, action: "type" }, leo: { x: 0.75, y: 0.5, action: "select" }, mina: { x: 0.02, y: 0.02, action: "select" }, kai: { x: 0.3, y: 0.75, action: "click" } },
  footer: { ava: { x: 0.15, y: 0.4, action: "type" }, leo: { x: 0.55, y: 0.4, action: "click" }, mina: { x: 0.8, y: 0.4, action: "click" }, kai: { x: 0.5, y: 0.85, action: "idle" } },
};
const STEP_MS = 1900;
const REVEAL_DELAY = 750;
const TOTAL_MS = STEP_MS * SECTIONS.length;

export function BuildIntro({ onDone }: { onDone: () => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const refs = useRef<Partial<Record<SectionId, HTMLDivElement | null>>>({});
  const [rects, setRects] = useState<Partial<Record<SectionId, { x: number; y: number; w: number; h: number }>>>({});
  const [step, setStep] = useState(-1);
  const [revealed, setRevealed] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [viewportH, setViewportH] = useState(800);

  const measure = useCallback(() => {
    const next: typeof rects = {};
    for (const id of SECTIONS) {
      const el = refs.current[id];
      if (el) next[id] = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
    }
    setRects(next);
    setViewportH(stageRef.current?.clientHeight ?? window.innerHeight);
  }, []);

  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);
  useEffect(() => { measure(); }, [revealed, measure]);

  // Timeline
  useEffect(() => {
    const timers: number[] = [];
    SECTIONS.forEach((_, i) => {
      timers.push(window.setTimeout(() => setStep(i), 300 + i * STEP_MS));
      timers.push(window.setTimeout(() => setRevealed(i), 300 + i * STEP_MS + REVEAL_DELAY));
    });
    timers.push(window.setTimeout(() => setFinished(true), 300 + TOTAL_MS + 200));
    timers.push(window.setTimeout(() => setLeaving(true), 300 + TOTAL_MS + 2300));
    timers.push(window.setTimeout(onDone, 300 + TOTAL_MS + 3000));
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const p = Math.min(100, ((performance.now() - start) / (TOTAL_MS + 400)) * 100);
      setProgress(p);
      if (p < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { timers.forEach(clearTimeout); cancelAnimationFrame(raf); };
  }, [onDone]);

  // Escape to skip
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onDone();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onDone]);

  const active = step >= 0 ? SECTIONS[step] : null;
  const activeRect = active ? rects[active] : undefined;
  const contentH = contentRef.current?.scrollHeight ?? 0;
  const scrollY = activeRect ? -Math.max(0, Math.min(activeRect.y - viewportH * 0.22, contentH - viewportH)) : 0;

  return (
    <motion.div
      className="fixed inset-0 z-[100] overflow-hidden stage-grid text-ink-foreground touch-none select-none"
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1, scale: leaving ? 1.04 : 1, filter: leaving ? "blur(6px)" : "blur(0px)" }}
      transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
      ref={stageRef}
      role="dialog"
      aria-label="Website building introduction"
    >
      {/* Editor chrome */}
      <div className="absolute inset-x-0 top-0 z-20 flex h-11 items-center gap-3 border-b border-stage-line bg-stage/90 px-4 text-xs backdrop-blur">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-cursor-3" /><span className="size-2.5 rounded-full bg-cursor-1" /><span className="size-2.5 rounded-full bg-cursor-4" />
        </div>
        <span className="hidden text-ink-muted sm:block">aurel.store — Live collaboration</span>
        <div className="ml-auto flex -space-x-2">
          {CURSORS.map((c) => (
            <span key={c.id} className="grid size-6 place-items-center rounded-full border-2 border-stage text-[10px] font-semibold text-ink" style={{ background: c.color }}>{c.name[0]}</span>
          ))}
        </div>
        <button onClick={onDone} className="rounded-full border border-ink-muted/40 px-3 py-1 text-ink-foreground transition hover:bg-ink-foreground hover:text-ink">Skip animation</button>
      </div>

      {/* Scrolling canvas */}
      <motion.div
        ref={contentRef}
        className="absolute inset-x-0 top-11 mx-auto max-w-6xl px-3 pt-6 pb-40 sm:px-8"
        animate={{ y: scrollY }}
        transition={{ duration: 1.4, ease: [0.45, 0, 0.2, 1] }}
      >
        <div className="relative">
          <Frame id="nav" refs={refs} active={active === "nav"} built={revealed >= 0} label="Navbar">
            <MockNav built={revealed >= 0} />
          </Frame>
          <Frame id="hero" refs={refs} active={active === "hero"} built={revealed >= 1} label="Hero / 1440×560">
            <MockHero built={revealed >= 1} />
          </Frame>
          <Frame id="cats" refs={refs} active={active === "cats"} built={revealed >= 2} label="Categories grid">
            <MockCats built={revealed >= 2} />
          </Frame>
          <Frame id="products" refs={refs} active={active === "products"} built={revealed >= 3} label="Product cards × 4">
            <MockProducts built={revealed >= 3} />
          </Frame>
          <Frame id="banner" refs={refs} active={active === "banner"} built={revealed >= 4} label="Promo banner">
            <MockBanner built={revealed >= 4} />
          </Frame>
          <Frame id="footer" refs={refs} active={active === "footer"} built={revealed >= 5} label="Footer">
            <MockFooter built={revealed >= 5} />
          </Frame>

          {/* Cursors live in content space so they scroll with the canvas */}
          {CURSORS.map((c, i) => {
            const t = active ? PLAN[active][c.id] : { x: 0.2 + i * 0.2, y: 0.5, action: "idle" as Action };
            const r = activeRect ?? { x: 0, y: 0, w: 800, h: 100 };
            return (
              <CursorSprite key={c.id} cursor={c} index={i} x={r.x + t.x * r.w} y={r.y + t.y * r.h} action={t.action} stepKey={step} hidden={finished} />
            );
          })}
        </div>
      </motion.div>

      {/* Progress */}
      <AnimatePresence>
        {!finished && (
          <motion.div
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-5 left-1/2 z-30 w-[min(92vw,380px)] -translate-x-1/2 rounded-2xl border border-stage-line bg-stage/85 p-4 backdrop-blur-md"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2"><Sparkles className="size-3.5 text-cursor-1" />Building your shopping experience…</span>
              <span className="font-mono tabular-nums">{Math.round(progress)}%</span>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-stage-line">
              <div className="h-full bg-copper transition-[width] duration-100" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-ink-muted">{active ? `Assembling ${active === "cats" ? "categories" : active}` : "Connecting designers"}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Finale */}
      <AnimatePresence>
        {finished && (
          <motion.div className="absolute inset-0 z-40 grid place-items-center bg-stage/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div className="text-center px-6" initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 160, damping: 16, delay: 0.15 }}>
              <motion.div className="mx-auto grid size-16 place-items-center rounded-full bg-copper shadow-glow" initial={{ rotate: -90 }} animate={{ rotate: 0 }} transition={{ duration: 0.6 }}>
                <Check className="size-8 text-primary-foreground" />
              </motion.div>
              <h2 className="mt-6 text-4xl sm:text-6xl">Your Shopping Experience <span className="text-copper italic">Is Ready</span></h2>
              <p className="mt-3 text-sm text-ink-muted">Built live by Ava, Leo, Mina & Kai</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ---------- pieces ---------- */

function Frame({ id, refs, active, built, label, children }: { id: SectionId; refs: React.MutableRefObject<Partial<Record<SectionId, HTMLDivElement | null>>>; active: boolean; built: boolean; label: string; children: ReactNode }) {
  return (
    <div ref={(el) => { refs.current[id] = el; }} className="relative mb-5">
      <motion.div
        className="relative overflow-hidden rounded-xl"
        animate={{ opacity: built || active ? 1 : 0.35 }}
        transition={{ duration: 0.5 }}
      >
        {children}
      </motion.div>
      <AnimatePresence>
        {active && (
          <motion.div className="pointer-events-none absolute -inset-1.5 rounded-xl border-2 border-cursor-2" initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <span className="absolute -top-6 left-0 rounded bg-cursor-2 px-1.5 py-0.5 font-mono text-[10px] text-ink">{label}</span>
            {["-left-1 -top-1", "-right-1 -top-1", "-left-1 -bottom-1", "-right-1 -bottom-1"].map((p) => (
              <span key={p} className={`absolute ${p} size-2 rounded-sm border border-cursor-2 bg-stage`} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CursorSprite({ cursor, index, x, y, action, stepKey, hidden }: { cursor: Cursor; index: number; x: number; y: number; action: Action; stepKey: number; hidden: boolean }) {
  const [clicks, setClicks] = useState(0);
  const [jitter, setJitter] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (action === "idle") return;
    const t = window.setTimeout(() => setClicks((c) => c + 1), 650 + index * 90);
    const t2 = action === "click" ? window.setTimeout(() => setClicks((c) => c + 1), 1250 + index * 60) : 0;
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [stepKey, action, index]);
  // natural micro-movement
  useEffect(() => {
    const id = window.setInterval(() => setJitter({ x: (Math.random() - 0.5) * 26, y: (Math.random() - 0.5) * 18 }), 700 + index * 130);
    return () => clearInterval(id);
  }, [index]);

  const dragging = action === "drag";
  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-0 z-30"
      initial={{ x: 200 + index * 150, y: -60, opacity: 0 }}
      animate={{ x: x + jitter.x, y: y + jitter.y, opacity: hidden ? 0 : 1 }}
      transition={{ x: { type: "spring", stiffness: 45 + index * 8, damping: 14, mass: 1 }, y: { type: "spring", stiffness: 40 + index * 6, damping: 13, mass: 1 }, opacity: { duration: 0.4 } }}
    >
      <AnimatePresence>
        {clicks > 0 && (
          <motion.span key={clicks} className="absolute -left-3 -top-3 size-6 rounded-full border-2" style={{ borderColor: cursor.color }} initial={{ scale: 0.3, opacity: 1 }} animate={{ scale: 2.2, opacity: 0 }} transition={{ duration: 0.6 }} />
        )}
      </AnimatePresence>
      <motion.svg width="22" height="22" viewBox="0 0 24 24" animate={{ scale: clicks % 2 ? 0.85 : 1, rotate: dragging ? -8 : 0 }} transition={{ duration: 0.15 }} style={{ filter: "drop-shadow(0 2px 4px rgb(0 0 0 / .4))" }}>
        <path d="M3 2l7.5 19 2.6-7.9L21 10.5z" fill={cursor.color} stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      </motion.svg>
      {dragging && <span className="absolute left-4 top-5 h-8 w-12 rounded-md border border-dashed opacity-70" style={{ borderColor: cursor.color, background: "color-mix(in oklab, " + cursor.color + " 20%, transparent)" }} />}
      <span className="absolute left-5 top-5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold text-ink shadow" style={{ background: cursor.color }}>
        {cursor.name}
        {action === "type" && <span className="ml-1 opacity-70">typing…</span>}
      </span>
    </motion.div>
  );
}

function Typed({ text, run, className }: { text: string; run: boolean; className?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    const id = window.setInterval(() => setN((v) => (v >= text.length ? (clearInterval(id), v) : v + 1)), 38);
    return () => clearInterval(id);
  }, [run, text]);
  return (
    <span className={className}>
      {text.slice(0, n)}
      {run && n < text.length && <span className="ml-0.5 inline-block h-[0.9em] w-0.5 animate-pulse bg-cursor-1 align-middle" />}
    </span>
  );
}

const Ghost = ({ className = "" }: { className?: string }) => <div className={`rounded-md border border-dashed border-ink-muted/40 bg-ink-foreground/5 ${className}`} />;

const pop = { initial: { opacity: 0, scale: 0.92, y: 12 }, animate: { opacity: 1, scale: 1, y: 0 } };

function MockNav({ built }: { built: boolean }) {
  return (
    <div className="flex h-14 items-center gap-4 rounded-xl bg-background px-4 text-foreground">
      <Typed text="AUREL" run={built} className="font-display text-2xl" />
      <div className="ml-4 hidden gap-4 text-xs sm:flex">
        {["Shop", "Audio", "Watches", "Bags", "Home"].map((l, i) =>
          built ? <motion.span key={l} {...pop} transition={{ delay: 0.3 + i * 0.08 }}>{l}</motion.span> : <Ghost key={l} className="h-3 w-10" />,
        )}
      </div>
      <div className="ml-auto flex gap-2">
        {[0, 1, 2].map((i) => built ? <motion.span key={i} {...pop} transition={{ delay: 0.6 + i * 0.1 }} className="size-6 rounded-full bg-muted" /> : <Ghost key={i} className="size-6 rounded-full" />)}
      </div>
    </div>
  );
}

function MockHero({ built }: { built: boolean }) {
  return (
    <div className="relative grid min-h-[280px] overflow-hidden rounded-xl bg-ink sm:min-h-[360px]">
      {built ? (
        <motion.img src="/images/hero.jpg" alt="" className="absolute inset-0 size-full object-cover" initial={{ opacity: 0, x: 120, scale: 1.1 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ duration: 0.9, ease: "easeOut" }} />
      ) : (
        <Ghost className="absolute inset-4" />
      )}
      <div className="relative z-10 flex flex-col justify-center gap-3 p-6 sm:p-10">
        <p className="text-[10px] uppercase tracking-[0.3em] text-ink-muted">{built ? "New season" : ""}</p>
        <h3 className="max-w-md text-3xl leading-tight text-ink-foreground sm:text-5xl"><Typed text="Objects worth keeping." run={built} /></h3>
        {built ? <motion.span {...pop} transition={{ delay: 0.9 }} className="mt-2 w-fit rounded-full bg-copper px-5 py-2 text-xs text-primary-foreground">Shop the collection</motion.span> : <Ghost className="h-8 w-36 rounded-full" />}
      </div>
    </div>
  );
}

function MockCats({ built }: { built: boolean }) {
  const cats = [["Audio", "cat-audio"], ["Watches", "cat-watches"], ["Bags", "cat-bags"], ["Home", "cat-home"]];
  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl bg-background p-3 sm:grid-cols-4">
      {cats.map(([n, img], i) =>
        built ? (
          <motion.div key={n} {...pop} transition={{ delay: i * 0.12, type: "spring", stiffness: 200, damping: 18 }} className="relative aspect-[4/3] overflow-hidden rounded-lg">
            <img src={`/images/${img}.jpg`} alt="" className="size-full object-cover" />
            <span className="absolute bottom-2 left-2 rounded-full bg-background/90 px-2 py-0.5 text-xs text-foreground">{n}</span>
          </motion.div>
        ) : <Ghost key={n} className="aspect-[4/3]" />,
      )}
    </div>
  );
}

function MockProducts({ built }: { built: boolean }) {
  const ps = [["p-headphones", "Aura Headphones", "$349"], ["p-watch", "Meridian", "$620"], ["p-tote", "Atelier Tote", "$410"], ["p-lamp", "Ember Lamp", "$160"]];
  return (
    <div className="rounded-xl bg-background p-4 text-foreground">
      <h4 className="mb-3 font-display text-2xl"><Typed text="Featured pieces" run={built} /></h4>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ps.map(([img, n, p], i) =>
          built ? (
            <motion.div key={n} initial={{ opacity: 0, x: i % 2 ? 160 : -160, y: 80, rotate: i % 2 ? 8 : -8 }} animate={{ opacity: 1, x: 0, y: 0, rotate: 0 }} transition={{ delay: i * 0.15, type: "spring", stiffness: 110, damping: 15 }}>
              <img src={`/images/${img}.jpg`} alt="" className="aspect-[4/5] w-full rounded-lg object-cover" />
              <p className="mt-2 text-xs font-medium">{n}</p>
              <p className="text-xs text-muted-foreground">{p}</p>
            </motion.div>
          ) : <Ghost key={n} className="aspect-[4/5]" />,
        )}
      </div>
    </div>
  );
}

function MockBanner({ built }: { built: boolean }) {
  return (
    <motion.div className="relative overflow-hidden rounded-xl p-8 sm:p-12" animate={{ backgroundColor: built ? "var(--primary)" : "transparent" }} transition={{ duration: 0.8 }}>
      {!built && <Ghost className="absolute inset-0" />}
      <p className="relative text-[10px] uppercase tracking-[0.3em] text-primary-foreground/80">{built && "Limited time"}</p>
      <h4 className="relative mt-2 font-display text-3xl text-primary-foreground sm:text-4xl"><Typed text="Free shipping over $200" run={built} /></h4>
      {built && <motion.span {...pop} transition={{ delay: 0.8 }} className="relative mt-4 inline-block rounded-full bg-ink px-4 py-1.5 text-xs text-ink-foreground">Explore</motion.span>}
    </motion.div>
  );
}

function MockFooter({ built }: { built: boolean }) {
  return (
    <div className="grid gap-6 rounded-xl bg-ink p-6 sm:grid-cols-4">
      <div className="sm:col-span-2"><p className="font-display text-3xl"><Typed text="AUREL" run={built} /></p>{built ? <motion.p {...pop} className="mt-2 text-xs text-ink-muted">Considered objects for slow living.</motion.p> : <Ghost className="mt-2 h-3 w-40" />}</div>
      {[0, 1].map((c) => (
        <div key={c} className="space-y-2">
          {[0, 1, 2].map((r) => built ? <motion.p key={r} {...pop} transition={{ delay: 0.2 + r * 0.1 }} className="h-2.5 w-20 rounded bg-ink-muted/40" /> : <Ghost key={r} className="h-2.5 w-20" />)}
        </div>
      ))}
    </div>
  );
}

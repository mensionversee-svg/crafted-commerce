import { lazy, Suspense, useCallback, useEffect, useState } from "react";

const BuildIntro = lazy(() => import("./BuildIntro").then((m) => ({ default: m.BuildIntro })));
const KEY = "aurel-intro-played";

/** Plays the build intro once per browser session; never blocks the store underneath. */
export function IntroGate() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!sessionStorage.getItem(KEY) && !reduced) setShow(true);
    else document.documentElement.classList.remove("intro-pending");
  }, []);
  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.classList.remove("intro-pending");
    return () => { document.body.style.overflow = prev; };
  }, [show]);
  const done = useCallback(() => {
    sessionStorage.setItem(KEY, "1");
    setShow(false);
    window.scrollTo({ top: 0 });
  }, []);
  if (!show) return null;
  return (
    <Suspense fallback={<div className="fixed inset-0 z-[100] stage-grid" />}>
      <BuildIntro onDone={done} />
    </Suspense>
  );
}

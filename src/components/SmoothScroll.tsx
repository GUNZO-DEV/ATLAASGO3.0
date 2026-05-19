import { useEffect, type ReactNode } from 'react';
import Lenis from 'lenis';
import { setupGSAP, ScrollTrigger, prefersReducedMotion } from '../lib/motion';

/**
 * Wraps the app in a Lenis-driven smooth-scroll RAF loop and keeps GSAP's
 * ScrollTrigger pinned animations in lockstep with the smoothed scroll
 * position.
 *
 * Respects `prefers-reduced-motion: reduce` — disables smoothing entirely.
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    setupGSAP();
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.2,
    });

    // Drive ScrollTrigger off the same RAF loop.
    lenis.on('scroll', ScrollTrigger.update);

    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    let rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}

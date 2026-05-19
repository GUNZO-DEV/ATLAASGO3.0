import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;
let reducedMotion: boolean | null = null;

export function setupGSAP(): void {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

export function prefersReducedMotion(): boolean {
  if (reducedMotion != null) return reducedMotion;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    reducedMotion = false;
    return false;
  }
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return reducedMotion;
}

export { gsap, ScrollTrigger };

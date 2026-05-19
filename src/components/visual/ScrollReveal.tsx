import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '../../lib/motion';

/**
 * Word-by-word scroll-driven typography reveal. Splits children text into
 * spans, masks them with a brand-tinted block, then drives the reveal off
 * ScrollTrigger so it stays locked to the smoothed scroll.
 */
export function WordReveal({
  children,
  as: As = 'h2',
  className,
  delay = 0,
  style,
}: {
  children: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  className?: string;
  delay?: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const words = el.querySelectorAll<HTMLSpanElement>('[data-word]');
    if (!words.length) return;

    const rect = el.getBoundingClientRect();
    const aboveFold = rect.top < window.innerHeight;

    // gsap.from() animates FROM the supplied values to whatever the element
    // currently is (i.e., the natural rest state). Cleaner than set + to —
    // GSAP cleans up the inline transform on completion automatically.
    const tween = gsap.from(words, {
      y: '110%',
      opacity: 0,
      duration: 0.85,
      ease: 'power3.out',
      stagger: 0.04,
      delay,
      clearProps: 'transform,opacity',
      ...(aboveFold
        ? {}
        : {
            scrollTrigger: {
              trigger: el,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
            immediateRender: false, // never bake opacity:0 until trigger fires
          }),
    });
    return () => {
      tween.kill();
    };
  }, [delay]);

  return (
    <As
      ref={ref as unknown as React.RefObject<HTMLHeadingElement>}
      className={className}
      style={style}
    >
      {children.split(' ').map((w, i) => (
        <span
          key={i}
          style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom' }}
        >
          <span data-word style={{ display: 'inline-block', willChange: 'transform' }}>
            {w}
            {i < children.split(' ').length - 1 ? ' ' : ''}
          </span>
        </span>
      ))}
    </As>
  );
}

/**
 * Generic fade + lift on scroll-into-view.
 */
export function FadeUp({
  children,
  className,
  delay = 0,
  y = 30,
  style,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const rect = el.getBoundingClientRect();
    const aboveFold = rect.top < window.innerHeight;

    const tween = gsap.from(el, {
      y,
      opacity: 0,
      duration: 0.95,
      ease: 'power3.out',
      delay,
      clearProps: 'transform,opacity',
      ...(aboveFold
        ? {}
        : {
            scrollTrigger: {
              trigger: el,
              start: 'top 88%',
              toggleActions: 'play none none none',
            },
            immediateRender: false, // never bake opacity:0 until trigger fires
          }),
    });
    return () => {
      tween.kill();
    };
  }, [delay, y]);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

/**
 * Re-runs ScrollTrigger.refresh() after the route or content mutates so pinned
 * sections recompute their bounds.
 */
export function useScrollRefresh(dep: unknown) {
  useEffect(() => {
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 80);
    return () => window.clearTimeout(id);
  }, [dep]);
}

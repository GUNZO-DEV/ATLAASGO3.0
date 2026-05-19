import { useEffect, useRef, type ReactNode } from 'react';
import { gsap } from '../../lib/motion';
import { prefersReducedMotion } from '../../lib/motion';

/**
 * Magnetic cursor pull — the wrapped element drifts toward the cursor with a
 * soft spring and snaps back on leave. Cheap (single quickTo per element).
 */
export default function Magnetic({
  children,
  strength = 26,
  className,
  as: As = 'div',
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
  as?: 'div' | 'span';
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const el = ref.current;
    if (!el) return;
    const setX = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3.out' });
    const setY = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3.out' });

    const move = (evt: Event) => {
      const e = evt as globalThis.MouseEvent;
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      setX((x / (r.width / 2)) * strength);
      setY((y / (r.height / 2)) * strength);
    };
    const leave = () => {
      setX(0);
      setY(0);
    };

    el.addEventListener('mousemove', move);
    el.addEventListener('mouseleave', leave);
    return () => {
      el.removeEventListener('mousemove', move);
      el.removeEventListener('mouseleave', leave);
    };
  }, [strength]);

  return (
    <As
      ref={(el) => {
        ref.current = el;
      }}
      className={className}
      style={{ display: 'inline-block', willChange: 'transform' }}
    >
      {children}
    </As>
  );
}

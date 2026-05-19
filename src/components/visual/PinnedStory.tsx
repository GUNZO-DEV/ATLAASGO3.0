import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '../../lib/motion';

export type StoryBeat = {
  eyebrow: string;
  title: string;
  body: string;
  emoji: string;
};

/**
 * Apple-style pinned scroll narrative. The whole section sticks to the viewport
 * while the user scrolls through `beats`, each beat fading in then back out.
 * The right-hand visual panel cross-fades emojis. No re-renders during scroll —
 * everything is GSAP-driven.
 */
export default function PinnedStory({ beats, label }: { beats: StoryBeat[]; label: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;

    const beatNodes = el.querySelectorAll<HTMLDivElement>('[data-beat]');
    const emojiNodes = el.querySelectorAll<HTMLDivElement>('[data-emoji]');
    const beatCount = beatNodes.length;
    if (!beatCount) return;

    gsap.set(beatNodes, { opacity: 0, y: 40 });
    gsap.set(beatNodes[0], { opacity: 1, y: 0 });
    gsap.set(emojiNodes, { opacity: 0, scale: 0.6, rotateZ: -8 });
    gsap.set(emojiNodes[0], { opacity: 1, scale: 1, rotateZ: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: 'top top',
        end: `+=${beatCount * 80}%`,
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    for (let i = 1; i < beatCount; i++) {
      tl.to(
        beatNodes[i - 1],
        { opacity: 0, y: -40, duration: 0.4, ease: 'power2.in' },
        `>`,
      );
      tl.to(
        emojiNodes[i - 1],
        { opacity: 0, scale: 1.2, rotateZ: 8, duration: 0.4, ease: 'power2.in' },
        '<',
      );
      tl.to(
        beatNodes[i],
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' },
        '>',
      );
      tl.to(
        emojiNodes[i],
        { opacity: 1, scale: 1, rotateZ: 0, duration: 0.5, ease: 'back.out(1.6)' },
        '<',
      );
      tl.to({}, { duration: 0.4 }); // hold
    }

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [beats]);

  return (
    <section ref={root} className="pinned-story">
      <div className="pinned-story-bg" />
      <div className="container pinned-story-grid">
        <div className="pinned-story-text">
          <div className="section-tag" style={{ marginBottom: 14 }}>
            ⚡ {label}
          </div>
          <div className="pinned-story-stack">
            {beats.map((b, i) => (
              <div data-beat key={i} className="pinned-story-beat">
                <div className="pinned-story-eyebrow">{b.eyebrow}</div>
                <h2 className="pinned-story-title">{b.title}</h2>
                <p className="pinned-story-body">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="pinned-story-visual">
          <div className="pinned-story-emoji-stack">
            {beats.map((b, i) => (
              <div data-emoji key={i} className="pinned-story-emoji">
                {b.emoji}
              </div>
            ))}
          </div>
          <div className="pinned-story-progress">
            {beats.map((_, i) => (
              <span key={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

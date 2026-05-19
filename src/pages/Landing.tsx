import { lazy, Suspense } from 'react';
import Hero from '../components/Hero';
import { LocalLegends, HowItWorks, Tripersona, PWABanner } from '../components/Sections';
import SocialProof from '../components/SocialProof';
import InstallToast from '../components/InstallToast';
import { FadeUp } from '../components/visual/ScrollReveal';

// Pinned-scroll narrative section stays — keeps the brand storytelling beat
// the user already liked. Lazy-loaded so initial paint stays fast.
const PinnedStory = lazy(() => import('../components/visual/PinnedStory'));

const STORY_BEATS = [
  {
    eyebrow: 'Chapter 1 · Discover',
    title: 'A medina kitchen, in your palm.',
    body: 'Real recipes from families who have cooked Ifrane for decades — vetted, photographed, and curated. No ghost kitchens. No commissary food.',
    emoji: '🫖',
  },
  {
    eyebrow: 'Chapter 2 · Tap',
    title: 'One landmark. One pin. Done.',
    body: 'Drop a GPS pin, type "near the Grand Mosque", and your driver knows exactly where you are. The Moroccan way of describing a place — engineered into the protocol.',
    emoji: '📍',
  },
  {
    eyebrow: 'Chapter 3 · Track',
    title: 'Watch it climb the Atlas.',
    body: 'Live timeline, six-stage ETA, weather-aware estimates. Chat with Youssef on the way — quick replies, location share, all in one tap.',
    emoji: '🏔',
  },
  {
    eyebrow: 'Chapter 4 · Earn',
    title: 'A platform that pays its riders.',
    body: '60–90 dh/hour average, daily payouts, SOS-safe. Performance bonuses you can see climb in real-time. Made for student-riders and Atlas regulars.',
    emoji: '🏍',
  },
];

export default function Landing() {
  return (
    <>
      <Hero />

      <Suspense fallback={null}>
        <PinnedStory beats={STORY_BEATS} label="The AtlaasGo Story" />
      </Suspense>

      {/* No FadeUp wrappers below the fold — they use ScrollTrigger with
          immediateRender, which leaves elements at opacity:0 if the trigger
          ever fails to fire (mobile, low-end, Lenis timing). Internal entry
          animations on each section are enough. */}
      <LocalLegends />
      <HowItWorks />
      <SocialProof />
      <Tripersona />
      <PWABanner />
      <InstallToast />
    </>
  );
}

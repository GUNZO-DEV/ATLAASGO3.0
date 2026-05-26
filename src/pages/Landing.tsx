import { lazy, Suspense, useEffect, useState } from 'react';
import Hero from '../components/Hero';
import { LocalLegends, HowItWorks, Tripersona, PWABanner } from '../components/Sections';
import SocialProof from '../components/SocialProof';
import InstallToast from '../components/InstallToast';
import MobileHomeScreen from '../components/MobileHomeScreen';
import { useSEO } from '../lib/seo';

// Pinned-scroll narrative section — desktop only (heavy, scroll-locked)
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

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const on = () => setMobile(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return mobile;
}

export default function Landing() {
  const isMobile = useIsMobile();
  useSEO({
    title: undefined,
    description:
      "AtlaasGo — Ifrane's premium delivery service. 28+ local partners, average 22-minute delivery, dorm-drop, cash or card. Built for AUI and the Atlas region.",
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'AtlaasGo',
      url: 'https://atlaasgo.com',
      logo: 'https://atlaasgo.com/icons/icon-512.png',
      sameAs: [],
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Ifrane',
        addressCountry: 'MA',
      },
    },
  });

  // ── Mobile: a single, curated app-feel landing screen ────────────
  if (isMobile) {
    return (
      <>
        <MobileHomeScreen />
        <InstallToast />
      </>
    );
  }

  // ── Desktop: full marketing narrative ────────────────────────────
  return (
    <>
      <Hero />
      <Suspense fallback={null}>
        <PinnedStory beats={STORY_BEATS} label="The AtlaasGo Story" />
      </Suspense>
      <LocalLegends />
      <HowItWorks />
      <SocialProof />
      <Tripersona />
      <PWABanner />
      <InstallToast />
    </>
  );
}

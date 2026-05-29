import { lazy, Suspense, useEffect, useState } from 'react';
import Hero from '../components/Hero';
import { LocalLegends, HowItWorks, Tripersona, PWABanner } from '../components/Sections';
import SocialProof from '../components/SocialProof';
import InstallToast from '../components/InstallToast';
import MobileHomeScreen from '../components/MobileHomeScreen';
import { useSEO } from '../lib/seo';

// Pinned 3D isometric Atlas Journey — desktop only (heavy, scroll-locked).
// Lazy-loaded so initial paint stays fast.
const AtlasJourney = lazy(() => import('../components/AtlasJourney'));
// Interactive 3D AUI campus diorama — also lazy-loaded (Three.js scene).
const Campus3D = lazy(() => import('../components/Campus3D'));

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
      <HowItWorks />
      <Suspense fallback={null}>
        <AtlasJourney />
      </Suspense>
      <Suspense fallback={null}>
        <Campus3D />
      </Suspense>
      <LocalLegends />
      <SocialProof />
      <Tripersona />
      <PWABanner />
      <InstallToast />
    </>
  );
}

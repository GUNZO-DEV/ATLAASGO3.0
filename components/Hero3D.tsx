"use client";

/**
 * 3D hero background.
 *
 * To activate the Spline scene:
 *  1. Create a scene at https://spline.design
 *  2. Share → "Export" → copy the .splinecode URL
 *  3. Replace the SPLINE_URL constant below
 *
 * Until then the animated mesh gradient fallback renders instead.
 */

import dynamic from "next/dynamic";
import { useState } from "react";

// Replace with your exported Spline scene URL
const SPLINE_URL = "";

const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
  loading: () => null,
});

export default function Hero3D() {
  const [splineReady, setSplineReady] = useState(false);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Animated mesh gradient — always visible, hidden once Spline loads */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          opacity: splineReady ? 0 : 1,
          background: `
            radial-gradient(ellipse 80% 60% at 70% 20%, rgba(0,103,71,0.35) 0%, transparent 65%),
            radial-gradient(ellipse 60% 50% at 20% 80%, rgba(184,151,62,0.18) 0%, transparent 55%),
            radial-gradient(ellipse 40% 40% at 90% 90%, rgba(0,77,53,0.2) 0%, transparent 50%)
          `,
        }}
      />

      {/* Spline scene — only mounted when a URL is provided */}
      {SPLINE_URL && (
        <div
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: splineReady ? 0.45 : 0 }}
        >
          <Spline scene={SPLINE_URL} onLoad={() => setSplineReady(true)} />
        </div>
      )}
    </div>
  );
}

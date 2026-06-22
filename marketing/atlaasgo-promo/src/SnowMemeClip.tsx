import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";
import { CORAL, EMERALD, FONT, frostBg, fadeUp, AppIcon } from "./brand";

/* deterministic pseudo-random so flakes don't jitter between renders */
function rnd(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Light falling-snow layer (same idea as SnowClip's Snow). */
const Snow: React.FC<{ count?: number }> = ({ count = 48 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      {Array.from({ length: count }).map((_, i) => {
        const x0 = rnd(i, 1) * width;
        const size = 6 + rnd(i, 2) * 18;
        const speed = 1.3 + rnd(i, 3) * 3.2;
        const phase = rnd(i, 5) * 1000;
        const y = ((frame * speed + phase) % (height + 60)) - 30;
        const x = x0 + Math.sin((frame + phase) * 0.03) * 40 * (rnd(i, 4) - 0.5);
        const op = 0.3 + rnd(i, 6) * 0.5;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: 999,
              background: "#fff",
              opacity: op,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Rounded white pill, like SnowClip's Chip. */
const Pill: React.FC<{ label: string; color: string; delay: number }> = ({
  label,
  color,
  delay,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        ...fadeUp(frame, delay, 12, 24),
        background: "#fff",
        color,
        fontSize: 46,
        fontWeight: 900,
        fontFamily: FONT,
        padding: "22px 50px",
        borderRadius: 999,
        boxShadow: "0 14px 34px rgba(0,0,0,0.20)",
      }}
    >
      {label}
    </div>
  );
};

/* ── BEAT 1 ── "Lmaghrib f June:" + ☀️🥵 36° (hot, no snow over this one) */
const Hot: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 8, fps, config: { damping: 11 } });
  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center" }}
    >
      <div
        style={{
          ...fadeUp(frame, 2, 12, 30),
          color: "rgba(255,255,255,0.95)",
          fontSize: 70,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -1,
          textAlign: "center",
          marginBottom: 30,
        }}
      >
        Lmaghrib f June:
      </div>
      <div
        style={{
          transform: `scale(${0.6 + Math.min(pop, 1) * 0.4})`,
          color: "#fff",
          fontSize: 150,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -4,
          textAlign: "center",
          lineHeight: 1.0,
        }}
      >
        ☀️🥵
        <div style={{ fontSize: 130, marginTop: 8 }}>36°</div>
      </div>
    </AbsoluteFill>
  );
};

/* ── BEAT 2 ── hard cut: "Ifrane f June:" + ❄️🥶 −2° (snow falls here) */
const Cold: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 8, fps, config: { damping: 11 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          ...fadeUp(frame, 2, 12, 30),
          color: "rgba(255,255,255,0.95)",
          fontSize: 70,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -1,
          textAlign: "center",
          marginBottom: 30,
        }}
      >
        Ifrane f June:
      </div>
      <div
        style={{
          transform: `scale(${0.6 + Math.min(pop, 1) * 0.4})`,
          color: "#fff",
          fontSize: 150,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -4,
          textAlign: "center",
          lineHeight: 1.0,
        }}
      >
        ❄️🥶
        <div style={{ fontSize: 130, marginTop: 8 }}>−2°</div>
      </div>
    </AbsoluteFill>
  );
};

/* ── BEAT 3 ── setup → punchline */
const Punch: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        padding: "0 70px",
      }}
    >
      <div
        style={{
          ...fadeUp(frame, 2, 12, 30),
          color: "rgba(255,255,255,0.95)",
          fontSize: 78,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -2,
          textAlign: "center",
          lineHeight: 1.06,
          marginBottom: 48,
        }}
      >
        berd bzzaf bash
        <br />
        tkhroj? 🥶
      </div>
      <div
        style={{
          ...fadeUp(frame, 22, 14, 34),
          background: "#fff",
          color: CORAL,
          fontSize: 64,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -2,
          textAlign: "center",
          lineHeight: 1.1,
          padding: "34px 52px",
          borderRadius: 44,
          boxShadow: "0 20px 50px rgba(0,0,0,0.28)",
        }}
      >
        AtlaasGo: kanwslo
        <br />
        7tta f telj ❄️
      </div>
    </AbsoluteFill>
  );
};

/* ── BEAT 4 ── CTA */
const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 13 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${0.6 + pop * 0.4})` }}>
        <AppIcon size={230} />
      </div>
      <div
        style={{
          ...fadeUp(frame, 12),
          marginTop: 46,
          color: "#fff",
          fontSize: 108,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -3,
        }}
      >
        AtlaasGo
      </div>
      <div
        style={{
          ...fadeUp(frame, 22),
          marginTop: 32,
          display: "flex",
          gap: 20,
        }}
      >
        <Pill label="Stay cozy" color={EMERALD} delay={22} />
      </div>
      <div
        style={{
          ...fadeUp(frame, 30),
          marginTop: 24,
          background: "#fff",
          color: CORAL,
          fontSize: 50,
          fontWeight: 900,
          fontFamily: FONT,
          padding: "26px 64px",
          borderRadius: 999,
          boxShadow: "0 18px 44px rgba(0,0,0,0.26)",
        }}
      >
        order now
      </div>
    </AbsoluteFill>
  );
};

export const SnowMemeClip: React.FC = () => (
  <AbsoluteFill style={frostBg}>
    {/* Snow starts at the cold cut (frame 70) and stays for the rest. */}
    <Sequence from={70}>
      <Snow />
    </Sequence>
    <Sequence durationInFrames={70}>
      <Hot />
    </Sequence>
    <Sequence from={70} durationInFrames={70}>
      <Cold />
    </Sequence>
    <Sequence from={140} durationInFrames={120}>
      <Punch />
    </Sequence>
    <Sequence from={260} durationInFrames={70}>
      <CTA />
    </Sequence>
  </AbsoluteFill>
);

import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";
import { CORAL, FONT, coralBg, fadeUp, AppIcon } from "./brand";

/* Scene 1 — timestamp / locale stamp at the cité U, midnight vibe */
const S1: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          ...fadeUp(frame, 2, 14, 30),
          color: "rgba(255,255,255,0.92)",
          fontSize: 44,
          fontWeight: 800,
          letterSpacing: 6,
          fontFamily: FONT,
          textTransform: "uppercase",
          marginBottom: 26,
        }}
      >
        cité U
      </div>
      <div
        style={{
          ...fadeUp(frame, 12, 16, 40),
          color: "#fff",
          fontSize: 150,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -4,
          textAlign: "center",
          lineHeight: 1.0,
        }}
      >
        23:47 🌙
      </div>
    </AbsoluteFill>
  );
};

/* Scene 2 — the punch: everyone is starving */
const S2: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          ...fadeUp(frame, 2, 14, 40),
          color: "#fff",
          fontSize: 118,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -3,
          textAlign: "center",
          lineHeight: 1.04,
          padding: "0 40px",
        }}
      >
        Jou3 drbna
        <br />
        kamlin 😩
      </div>
    </AbsoluteFill>
  );
};

/* one stacked solution line, white pill on coral */
const Line: React.FC<{ label: string; delay: number }> = ({ label, delay }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        ...fadeUp(frame, delay, 13, 28),
        background: "#fff",
        color: CORAL,
        fontSize: 52,
        fontWeight: 900,
        fontFamily: FONT,
        padding: "22px 46px",
        borderRadius: 999,
        marginBottom: 24,
        boxShadow: "0 16px 38px rgba(0,0,0,0.20)",
        textAlign: "center",
      }}
    >
      {label}
    </div>
  );
};

/* Scene 3 — the fix: group order, split delivery, everyone fed */
const S3: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          ...fadeUp(frame, 2, 14, 30),
          color: "#fff",
          fontSize: 72,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -2,
          textAlign: "center",
          marginBottom: 44,
        }}
      >
        Group order 👥
      </div>
      <Line label="qsmna l livraison 💸" delay={14} />
      <Line label="kolchi cheb3an 🍔🍕🌮" delay={28} />
    </AbsoluteFill>
  );
};

/* Scene 4 — CTA: app icon pop + brand pill */
const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${0.6 + pop * 0.4})` }}>
        <AppIcon size={230} />
      </div>
      <div
        style={{
          ...fadeUp(frame, 14, 16, 40),
          marginTop: 44,
          color: "#fff",
          fontSize: 104,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -3,
        }}
      >
        AtlaasGo
      </div>
      <div
        style={{
          ...fadeUp(frame, 26, 16, 36),
          marginTop: 34,
          background: "#fff",
          color: CORAL,
          fontSize: 44,
          fontWeight: 800,
          fontFamily: FONT,
          padding: "26px 58px",
          borderRadius: 999,
          textAlign: "center",
          boxShadow: "0 16px 38px rgba(0,0,0,0.20)",
        }}
      >
        group orders f la cité
      </div>
    </AbsoluteFill>
  );
};

export const DormClip: React.FC = () => (
  <AbsoluteFill style={coralBg}>
    <Sequence durationInFrames={78}>
      <S1 />
    </Sequence>
    <Sequence from={78} durationInFrames={72}>
      <S2 />
    </Sequence>
    <Sequence from={150} durationInFrames={114}>
      <S3 />
    </Sequence>
    <Sequence from={264} durationInFrames={66}>
      <CTA />
    </Sequence>
  </AbsoluteFill>
);

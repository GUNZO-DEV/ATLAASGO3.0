import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";
import { CORAL, FONT, coralBg, fadeUp, AppIcon, Pin } from "./brand";

/* Beat 1: POV setup — you're in a small Moroccan city */
const S1: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 60 }}>
      <div
        style={{
          ...fadeUp(frame, 2, 12, 30),
          color: "rgba(255,255,255,0.92)",
          fontSize: 46,
          fontWeight: 900,
          letterSpacing: 12,
          fontFamily: FONT,
          textTransform: "uppercase",
          marginBottom: 28,
        }}
      >
        POV
      </div>
      <div
        style={{
          ...fadeUp(frame, 14, 14, 44),
          color: "#fff",
          fontSize: 96,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -2,
          textAlign: "center",
          lineHeight: 1.05,
        }}
      >
        nta f city sghira
        <br />
        f lmaghrib 📍
      </div>
    </AbsoluteFill>
  );
};

/* Beat 2: The other apps — sad red "not available" card */
const S2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 16, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 60 }}>
      <div
        style={{
          ...fadeUp(frame, 2, 12, 30),
          color: "rgba(255,255,255,0.92)",
          fontSize: 64,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -1,
          marginBottom: 44,
          textAlign: "center",
        }}
      >
        L'apps l'okhrin:
      </div>
      <div
        style={{
          transform: `scale(${0.7 + pop * 0.3})`,
          background: "#fff",
          borderRadius: 40,
          padding: "56px 52px",
          maxWidth: 880,
          boxShadow: "0 30px 70px rgba(0,0,0,0.30)",
          textAlign: "center",
          border: "4px solid #E11D2A",
        }}
      >
        <div style={{ fontSize: 88, marginBottom: 18 }}>💔</div>
        <div
          style={{
            color: "#E11D2A",
            fontSize: 56,
            fontWeight: 900,
            fontFamily: FONT,
            lineHeight: 1.15,
          }}
        >
          Service mch disponible
          <br />
          f l manteqa dyalek
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* Beat 3: AtlaasGo — celebratory punchline with a Pin drop */
const S3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 4, fps, config: { damping: 11 } });
  const pinDrop = spring({ frame: frame - 22, fps, config: { damping: 9, stiffness: 120 } });
  const pinY = (1 - pinDrop) * -180;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 60 }}>
      <div
        style={{
          transform: `scale(${0.6 + pop * 0.4})`,
          color: "#fff",
          fontSize: 150,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -4,
          marginBottom: 24,
        }}
      >
        AtlaasGo:
      </div>
      <div style={{ transform: `translateY(${pinY}px)`, opacity: pinDrop, marginBottom: 8 }}>
        <Pin size={120} color="#fff" />
      </div>
      <div
        style={{
          ...fadeUp(frame, 30, 14, 40),
          color: "#fff",
          fontSize: 78,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -2,
          textAlign: "center",
          lineHeight: 1.08,
        }}
      >
        🛵💨 commande wselat
        <br />
        l bab dyalek!
      </div>
    </AbsoluteFill>
  );
};

/* Beat 4: CTA — app icon + brand + tagline pill */
const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 13 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 60 }}>
      <div style={{ transform: `scale(${0.6 + pop * 0.4})` }}>
        <AppIcon size={220} />
      </div>
      <div
        style={{
          ...fadeUp(frame, 12, 14, 40),
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
          ...fadeUp(frame, 24, 14, 36),
          marginTop: 36,
          background: "#fff",
          color: CORAL,
          fontSize: 44,
          fontWeight: 900,
          fontFamily: FONT,
          padding: "26px 56px",
          borderRadius: 999,
          textAlign: "center",
          boxShadow: "0 18px 44px rgba(0,0,0,0.22)",
          lineHeight: 1.1,
        }}
      >
        Kanwslo fin l'okhrin
        <br />
        ma kaywsluch
      </div>
    </AbsoluteFill>
  );
};

export const GlovoClip: React.FC = () => (
  <AbsoluteFill style={coralBg}>
    <Sequence durationInFrames={78}>
      <S1 />
    </Sequence>
    <Sequence from={78} durationInFrames={96}>
      <S2 />
    </Sequence>
    <Sequence from={174} durationInFrames={96}>
      <S3 />
    </Sequence>
    <Sequence from={270} durationInFrames={60}>
      <CTA />
    </Sequence>
  </AbsoluteFill>
);

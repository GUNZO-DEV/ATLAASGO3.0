import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";
import { CORAL, EMERALD, FONT, coralBg, fadeUp, AppIcon, Pin } from "./brand";

const INK_DARK = "#1A1410";

/* ── Beat 1 — Driver calling: "fin l adresse?" ───────────────────── */
const S1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 4, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 70 }}>
      <div
        style={{
          ...fadeUp(frame, 2, 12, 30),
          color: "rgba(255,255,255,0.92)",
          fontSize: 46,
          fontWeight: 800,
          fontFamily: FONT,
          letterSpacing: 2,
          textTransform: "uppercase",
          marginBottom: 30,
        }}
      >
        Driver:
      </div>
      <div
        style={{
          transform: `scale(${0.7 + pop * 0.3})`,
          background: "#fff",
          color: INK_DARK,
          fontSize: 96,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -2,
          lineHeight: 1.08,
          textAlign: "center",
          padding: "44px 56px",
          borderRadius: 48,
          boxShadow: "0 26px 70px rgba(0,0,0,0.32)",
        }}
      >
        📞 fin l<br />adresse?
      </div>
    </AbsoluteFill>
  );
};

/* a chat-bubble line that fades up + pops, with a wiggle for comedy */
const RambleLine: React.FC<{ text: string; delay: number; tilt: number }> = ({
  text,
  delay,
  tilt,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - delay, fps, config: { damping: 11, stiffness: 140 } });
  return (
    <div
      style={{
        ...fadeUp(frame, delay, 10, 24),
        transform: `scale(${0.6 + pop * 0.4}) rotate(${tilt}deg)`,
        transformOrigin: "left center",
        alignSelf: "flex-start",
        background: "#fff",
        color: INK_DARK,
        fontSize: 56,
        fontWeight: 800,
        fontFamily: FONT,
        letterSpacing: -1,
        lineHeight: 1.05,
        padding: "26px 38px",
        borderRadius: "40px 40px 40px 12px",
        marginBottom: 26,
        boxShadow: "0 16px 40px rgba(0,0,0,0.22)",
        maxWidth: "92%",
      }}
    >
      {text}
    </div>
  );
};

/* ── Beat 2 — "Nta:" then 3 rambling landmark lines pile up ──────── */
const S2: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 64px" }}>
      <div
        style={{
          ...fadeUp(frame, 2, 10, 24),
          color: "#fff",
          fontSize: 80,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -2,
          marginBottom: 40,
        }}
      >
        Nta:
      </div>
      <RambleLine text="7da pharmacie..." delay={16} tilt={-2} />
      <RambleLine text="qbalt 7anout dl3ggba..." delay={34} tilt={1.5} />
      <RambleLine text="fou9 makla, 7da...l 9hwa 😅" delay={52} tilt={-1.5} />
    </AbsoluteFill>
  );
};

/* ── Beat 3 — clean cut: AtlaasGo solution ───────────────────────── */
const S3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 14, fps, config: { damping: 13 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 70 }}>
      <div
        style={{
          ...fadeUp(frame, 2, 12, 28),
          color: "rgba(255,255,255,0.95)",
          fontSize: 54,
          fontWeight: 800,
          fontFamily: FONT,
          letterSpacing: 2,
          textTransform: "uppercase",
          marginBottom: 40,
        }}
      >
        AtlaasGo:
      </div>
      <div
        style={{
          transform: `scale(${0.72 + pop * 0.28})`,
          background: "#fff",
          color: EMERALD,
          fontSize: 92,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -2,
          lineHeight: 1.1,
          textAlign: "center",
          padding: "50px 56px",
          borderRadius: 52,
          boxShadow: "0 28px 76px rgba(0,0,0,0.34)",
        }}
      >
        📍 drop a pin
        <br />+ landmark
        <br />
        <span style={{ color: CORAL }}>= SAFI ✅</span>
      </div>
    </AbsoluteFill>
  );
};

/* ── Beat 4 — CTA ────────────────────────────────────────────────── */
const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12 } });
  const bob = Math.sin(frame * 0.16) * 10;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 60 }}>
      <div style={{ transform: `scale(${0.6 + pop * 0.4}) translateY(${bob}px)`, marginBottom: 30 }}>
        <Pin size={150} color="#fff" />
      </div>
      <div
        style={{
          ...fadeUp(frame, 12, 14, 30),
          color: "#fff",
          fontSize: 78,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -2,
          lineHeight: 1.06,
          textAlign: "center",
          marginBottom: 18,
        }}
      >
        Forget the address.
      </div>
      <div
        style={{
          ...fadeUp(frame, 22, 14, 30),
          color: "#fff",
          fontSize: 86,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -2,
          lineHeight: 1.06,
          textAlign: "center",
          marginBottom: 50,
        }}
      >
        Drop a landmark.
      </div>
      <div style={{ ...fadeUp(frame, 34, 14, 26), transform: `scale(${0.8 + Math.min(pop, 1) * 0.2})` }}>
        <AppIcon size={180} />
      </div>
      <div
        style={{
          ...fadeUp(frame, 42, 14, 26),
          marginTop: 34,
          color: "#fff",
          fontSize: 84,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -2,
        }}
      >
        AtlaasGo
      </div>
    </AbsoluteFill>
  );
};

export const LandmarkMemeClip: React.FC = () => (
  <AbsoluteFill style={coralBg}>
    <Sequence durationInFrames={70}>
      <S1 />
    </Sequence>
    <Sequence from={70} durationInFrames={100}>
      <S2 />
    </Sequence>
    <Sequence from={170} durationInFrames={80}>
      <S3 />
    </Sequence>
    <Sequence from={250} durationInFrames={80}>
      <CTA />
    </Sequence>
  </AbsoluteFill>
);

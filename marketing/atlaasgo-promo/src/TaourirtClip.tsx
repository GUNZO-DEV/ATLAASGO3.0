import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  staticFile,
} from "remotion";
import { CORAL, INK, FONT, fadeUp, AppIcon, Pin } from "./brand";

/* ── Layered premium background ───────────────────────────────────────────
   A warm sunset gradient base + two slow-drifting radial glows + a soft
   vignette. Everything below this layer reads as "depth", never flat.      */
const Backdrop: React.FC<{ tone?: "warm" | "deep" }> = ({ tone = "warm" }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame * 0.018) * 60;
  const drift2 = Math.cos(frame * 0.014) * 80;
  const base =
    tone === "deep"
      ? `linear-gradient(160deg, #2A1A14 0%, #5E2A14 48%, #C9421C 100%)`
      : `linear-gradient(155deg, #FF9A5E 0%, ${CORAL} 52%, #D8401A 100%)`;
  return (
    <AbsoluteFill style={{ background: base }}>
      {/* warm top-right glow */}
      <div
        style={{
          position: "absolute",
          top: -240 + drift,
          right: -180 - drift2 * 0.4,
          width: 760,
          height: 760,
          borderRadius: 999,
          background:
            "radial-gradient(circle, rgba(255,214,170,0.55) 0%, rgba(255,160,90,0) 70%)",
          filter: "blur(8px)",
        }}
      />
      {/* deep coral bloom bottom-left */}
      <div
        style={{
          position: "absolute",
          bottom: -260 - drift,
          left: -220 + drift2 * 0.5,
          width: 820,
          height: 820,
          borderRadius: 999,
          background:
            "radial-gradient(circle, rgba(255,87,34,0.5) 0%, rgba(201,66,28,0) 72%)",
          filter: "blur(6px)",
        }}
      />
      {/* soft floating shape for parallax */}
      <div
        style={{
          position: "absolute",
          top: 520 + Math.sin(frame * 0.02) * 40,
          left: 120 + Math.cos(frame * 0.016) * 50,
          width: 360,
          height: 360,
          borderRadius: 999,
          background:
            "radial-gradient(circle, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 70%)",
          filter: "blur(2px)",
        }}
      />
      {/* vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(120% 90% at 50% 42%, rgba(0,0,0,0) 52%, rgba(40,16,8,0.45) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

/* A glowing, pulsing location pill — "Taourirt 📍" */
const LocationPill: React.FC<{
  label: string;
  delay: number;
  style?: React.CSSProperties;
}> = ({ label, delay, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 13, mass: 0.7 } });
  const pulse = 0.5 + 0.5 * Math.sin(frame * 0.16);
  const glow = 26 + pulse * 26;
  return (
    <div
      style={{
        position: "absolute",
        opacity: interpolate(frame, [delay, delay + 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        transform: `scale(${0.7 + s * 0.3})`,
        display: "flex",
        alignItems: "center",
        gap: 16,
        background: "#fff",
        color: INK,
        fontSize: 46,
        fontWeight: 900,
        fontFamily: FONT,
        letterSpacing: -1,
        padding: "20px 40px 20px 30px",
        borderRadius: 999,
        boxShadow: `0 18px 44px rgba(0,0,0,0.28), 0 0 ${glow}px rgba(255,138,80,${
          0.4 + pulse * 0.4
        })`,
        ...style,
      }}
    >
      <div style={{ transform: "translateY(2px)" }}>
        <Pin size={42} color={CORAL} />
      </div>
      {label}
    </div>
  );
};

/* ── Scene 1 — POV hook ───────────────────────────────────────────────── */
const S1: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div
        style={{
          ...fadeUp(frame, 2, 14, 26),
          color: "rgba(255,255,255,0.85)",
          fontSize: 42,
          fontWeight: 800,
          letterSpacing: 10,
          fontFamily: FONT,
          textTransform: "uppercase",
          marginBottom: 30,
        }}
      >
        POV
      </div>
      <div
        style={{
          ...fadeUp(frame, 10, 16, 40),
          color: "#fff",
          fontSize: 122,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -4,
          textAlign: "center",
          lineHeight: 1.02,
          textShadow: "0 14px 40px rgba(40,16,8,0.4)",
        }}
      >
        nta f
      </div>
      {/* the city name lands big, then the pill stamps in under it */}
      <div
        style={{
          ...fadeUp(frame, 18, 16, 40),
          color: "#fff",
          fontSize: 168,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -6,
          textAlign: "center",
          lineHeight: 0.98,
          textShadow: "0 18px 50px rgba(40,16,8,0.45)",
        }}
      >
        Taourirt
      </div>
      <LocationPill
        label="Taourirt 📍"
        delay={34}
        style={{ position: "relative", marginTop: 50 }}
      />
    </AbsoluteFill>
  );
};

/* ── Scene 2 — the other apps fail (sad red card) ─────────────────────── */
const SadCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 8, fps, config: { damping: 12, mass: 0.8 } });
  // a small dejected shake + droop
  const tilt = Math.sin(frame * 0.12) * 1.4 - 3;
  const droop = interpolate(s, [0, 1], [60, 0]);
  return (
    <div
      style={{
        opacity: interpolate(frame, [8, 22], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        transform: `translateY(${droop}px) rotate(${tilt}deg) scale(${
          0.8 + s * 0.2
        })`,
        background: "linear-gradient(150deg, #B9342B 0%, #8E1F1A 100%)",
        border: "2px solid rgba(255,255,255,0.12)",
        borderRadius: 44,
        padding: "54px 60px",
        maxWidth: 720,
        textAlign: "center",
        boxShadow:
          "0 30px 70px rgba(40,8,6,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          color: "rgba(255,255,255,0.6)",
          fontSize: 34,
          fontWeight: 800,
          fontFamily: FONT,
          letterSpacing: 4,
          textTransform: "uppercase",
          marginBottom: 22,
        }}
      >
        l-apps l-okhrin
      </div>
      <div
        style={{
          color: "#fff",
          fontSize: 64,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -1.5,
          lineHeight: 1.1,
        }}
      >
        « service mch
        <br />
        disponible » 💔
      </div>
    </div>
  );
};

const S2: React.FC = () => {
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 70 }}>
      <SadCard />
    </AbsoluteFill>
  );
};

/* ── Phone mockup with the real screenshot inside (3D tilt + screen-glow) ─ */
const PhoneMockup: React.FC<{ enter: number }> = ({ enter }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - enter, fps, config: { damping: 13, mass: 0.9 } });

  // device geometry
  const W = 560;
  const H = (W * 2400) / 1080; // keep screenshot aspect → ~1244
  const bezel = 22;
  const radius = 56;

  // entrance: rise + scale; continuous: gentle 3D parallax sway
  const rise = interpolate(s, [0, 1], [120, 0]);
  const scale = 0.84 + s * 0.16;
  const swayY = Math.sin(frame * 0.03) * 6; // rotateY drift
  const swayX = Math.cos(frame * 0.024) * 3; // rotateX drift
  const opacity = interpolate(frame, [enter, enter + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "relative",
        opacity,
        perspective: 1600,
        transform: `translateY(${rise}px) scale(${scale})`,
      }}
    >
      {/* soft coral screen-glow bloom behind the device */}
      <div
        style={{
          position: "absolute",
          inset: -120,
          borderRadius: 999,
          background:
            "radial-gradient(circle at 50% 46%, rgba(255,138,80,0.65) 0%, rgba(255,87,34,0.25) 38%, rgba(255,87,34,0) 70%)",
          filter: "blur(30px)",
        }}
      />
      <div
        style={{
          position: "relative",
          width: W + bezel * 2,
          height: H + bezel * 2,
          borderRadius: radius,
          background: "linear-gradient(155deg, #1A1A1E 0%, #0C0C0C 100%)",
          padding: bezel,
          transformStyle: "preserve-3d",
          transform: `rotateY(${-8 + swayY}deg) rotateX(${4 + swayX}deg)`,
          boxShadow:
            "0 60px 120px rgba(20,8,4,0.6), 0 20px 50px rgba(0,0,0,0.45)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        {/* thin highlight rim */}
        <div
          style={{
            position: "absolute",
            inset: 3,
            borderRadius: radius - 3,
            border: "1.5px solid rgba(255,255,255,0.14)",
            pointerEvents: "none",
          }}
        />
        {/* screen — rounded-clipped real screenshot */}
        <div
          style={{
            width: W,
            height: H,
            borderRadius: radius - bezel,
            overflow: "hidden",
            position: "relative",
            background: "#000",
          }}
        >
          <Img
            src={staticFile("screens/login.png")}
            style={{
              width: W,
              height: H,
              objectFit: "cover",
              display: "block",
            }}
          />
          {/* subtle screen sheen */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(125deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 34%)",
              pointerEvents: "none",
            }}
          />
        </div>
        {/* notch */}
        <div
          style={{
            position: "absolute",
            top: bezel + 10,
            left: "50%",
            transform: "translateX(-50%)",
            width: 150,
            height: 30,
            borderRadius: 999,
            background: "#000",
          }}
        />
      </div>
    </div>
  );
};

/* ── Scene 3 — AtlaasGo answers (phone glows in) ──────────────────────── */
const S3: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          ...fadeUp(frame, 2, 14, 24),
          color: "#fff",
          fontSize: 88,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -2,
          textAlign: "center",
          marginTop: -40,
          marginBottom: 28,
          textShadow: "0 12px 36px rgba(40,16,8,0.4)",
        }}
      >
        AtlaasGo:
      </div>

      <PhoneMockup enter={10} />

      {/* the friendly reply pill, overlapping the phone */}
      <div
        style={{
          ...fadeUp(frame, 34, 16, 30),
          position: "relative",
          marginTop: -58,
          zIndex: 5,
          background: "#fff",
          color: INK,
          fontSize: 50,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -1,
          textAlign: "center",
          lineHeight: 1.15,
          padding: "30px 48px",
          borderRadius: 40,
          maxWidth: 760,
          boxShadow:
            "0 26px 60px rgba(0,0,0,0.32), 0 0 50px rgba(255,138,80,0.45)",
        }}
      >
        « 🛵 jina a sahbi,
        <br />
        chno bghiti? »
      </div>

      {/* location pill anchored near top of phone */}
      <LocationPill
        label="Taourirt 📍"
        delay={26}
        style={{ top: 250, right: 120 }}
      />
    </AbsoluteFill>
  );
};

/* ── Scene 4 — the message: small cities deserve it ───────────────────── */
const S4: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div
        style={{
          ...fadeUp(frame, 4, 16, 36),
          color: "#fff",
          fontSize: 110,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -3,
          textAlign: "center",
          lineHeight: 1.08,
          textShadow: "0 14px 40px rgba(40,16,8,0.4)",
        }}
      >
        Taourirt
        <br />
        katstahel tahya
      </div>
    </AbsoluteFill>
  );
};

/* ── Scene 5 — CTA ────────────────────────────────────────────────────── */
const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const glow = 30 + (0.5 + 0.5 * Math.sin(frame * 0.14)) * 30;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          transform: `scale(${0.6 + pop * 0.4})`,
          filter: `drop-shadow(0 0 ${glow}px rgba(255,138,80,0.6))`,
        }}
      >
        <AppIcon size={240} />
      </div>
      <div
        style={{
          ...fadeUp(frame, 14, 16, 40),
          marginTop: 48,
          color: "#fff",
          fontSize: 112,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -3,
          textShadow: "0 14px 40px rgba(40,16,8,0.4)",
        }}
      >
        AtlaasGo
      </div>
      <div
        style={{
          ...fadeUp(frame, 26, 16, 36),
          marginTop: 36,
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "#fff",
          color: CORAL,
          fontSize: 46,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -1,
          padding: "26px 52px 26px 40px",
          borderRadius: 999,
          textAlign: "center",
          boxShadow: "0 18px 44px rgba(0,0,0,0.28), 0 0 40px rgba(255,138,80,0.4)",
        }}
      >
        <div style={{ transform: "translateY(2px)" }}>
          <Pin size={40} color={CORAL} />
        </div>
        3la babek f Taourirt
      </div>
    </AbsoluteFill>
  );
};

/* ── Composition · 360 frames @ 30fps = 12s · SILENT ──────────────────── */
export const TaourirtClip: React.FC = () => {
  return (
    <AbsoluteFill>
      {/* Backdrop tone shifts a touch deeper during the "sad" beat */}
      <Sequence durationInFrames={84}>
        <Backdrop />
        <S1 />
      </Sequence>
      <Sequence from={84} durationInFrames={72}>
        <Backdrop tone="deep" />
        <S2 />
      </Sequence>
      <Sequence from={156} durationInFrames={108}>
        <Backdrop />
        <S3 />
      </Sequence>
      <Sequence from={264} durationInFrames={54}>
        <Backdrop />
        <S4 />
      </Sequence>
      <Sequence from={318} durationInFrames={42}>
        <Backdrop />
        <CTA />
      </Sequence>
    </AbsoluteFill>
  );
};

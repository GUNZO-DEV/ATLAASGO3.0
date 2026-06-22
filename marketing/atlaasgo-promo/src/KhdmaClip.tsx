import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  Easing,
} from "remotion";
import { CORAL, EMERALD, FONT, coralBg, fadeUp, AppIcon, Pin } from "./brand";

/* ------------------------------------------------------------------ *
 *  KhdmaClip — AtlaasGo rider hustle, synced to "lkhdma lkhdma".
 *  1080x1920 · 30fps · 360 frames (12s) · SILENT (sound added in TikTok).
 *  The grind is a repeated delivery beat on a ~14-frame cadence so each
 *  "lkhdma" lands on a "commande / wsel". That relentless loop IS the joke.
 * ------------------------------------------------------------------ */

const BEAT = 14; // frames per "lkhdma" hit (~0.47s @ 30fps)

/* deterministic pseudo-random (same trick as SnowClip's Snow) */
function rnd(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/* Soft radial sunset glows + a few drifting depth orbs for a little depth. */
const Glow: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const pulse = 0.5 + 0.5 * Math.sin(frame * 0.06);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: "-20%",
          top: "-15%",
          width: "90%",
          height: "60%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,190,120,0.55) 0%, rgba(255,190,120,0) 70%)",
          opacity: 0.6 + pulse * 0.25,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "-25%",
          bottom: "-10%",
          width: "95%",
          height: "55%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(231,66,26,0.5) 0%, rgba(231,66,26,0) 70%)",
          opacity: 0.55 + (1 - pulse) * 0.25,
        }}
      />
      {Array.from({ length: 16 }).map((_, i) => {
        const x0 = rnd(i, 1) * width;
        const size = 8 + rnd(i, 2) * 26;
        const speed = 0.6 + rnd(i, 3) * 1.6;
        const phase = rnd(i, 5) * 1000;
        const y = ((frame * speed + phase) % (height + 80)) - 40;
        const x = x0 + Math.sin((frame + phase) * 0.02) * 30;
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
              opacity: 0.06 + rnd(i, 6) * 0.1,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/* SnowClip-style white pill chip. */
const Chip: React.FC<{
  label: string;
  color: string;
  delay: number;
  size?: number;
}> = ({ label, color, delay, size = 44 }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        ...fadeUp(frame, delay, 12, 24),
        background: "#fff",
        color,
        fontSize: size,
        fontWeight: 900,
        fontFamily: FONT,
        padding: "18px 40px",
        borderRadius: 999,
        boxShadow: "0 14px 34px rgba(0,0,0,0.22)",
      }}
    >
      {label}
    </div>
  );
};

/* ----------------------------- BEAT 1: HOOK (0–60) ----------------------------- */
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // toggle pops on around frame 26
  const togglePop = spring({
    frame: frame - 26,
    fps,
    config: { damping: 12 },
  });
  const knob = interpolate(togglePop, [0, 1], [0, 56]);
  const on = frame >= 26;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          ...fadeUp(frame, 2, 12, 30),
          color: "rgba(255,255,255,0.92)",
          fontSize: 44,
          fontWeight: 900,
          letterSpacing: 6,
          fontFamily: FONT,
          textTransform: "uppercase",
          marginBottom: 24,
        }}
      >
        POV
      </div>
      <div
        style={{
          ...fadeUp(frame, 8, 14, 40),
          color: "#fff",
          fontSize: 100,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -3,
          textAlign: "center",
          lineHeight: 1.04,
          padding: "0 60px",
        }}
      >
        wlliti rider
        <br />
        m3a AtlaasGo 🛵
      </div>

      {/* online toggle */}
      <div
        style={{
          marginTop: 60,
          display: "flex",
          alignItems: "center",
          gap: 28,
          ...fadeUp(frame, 18, 12, 20),
        }}
      >
        <div
          style={{
            width: 132,
            height: 72,
            borderRadius: 999,
            background: on ? EMERALD : "rgba(255,255,255,0.35)",
            position: "relative",
            transition: "none",
            boxShadow: "0 10px 28px rgba(0,0,0,0.25)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              width: 56,
              height: 56,
              borderRadius: 999,
              background: "#fff",
              transform: `translateX(${knob}px)`,
            }}
          />
        </div>
        <div
          style={{
            color: "#fff",
            fontSize: 56,
            fontWeight: 900,
            fontFamily: FONT,
            opacity: on ? 1 : 0.5,
          }}
        >
          online ✅
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------------- BEAT 2: THE GRIND LOOP (60–210) ---------------------- *
 *  10 hits on the beat, alternating "commande 🛵" / "wsel ✅".
 *  Each hit: spring scale pop + a small position shuffle so it feels relentless.
 *  A city ticker cycles underneath to show range.
 * --------------------------------------------------------------------------- */
const CITIES = [
  "Taourirt",
  "Ifrane",
  "Oujda",
  "Berkane",
  "Saïda",
  "Guercif",
  "Taza",
  "Nador",
  "El Aïoun",
  "Jerada",
];

const GrindLoop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const HITS = 10; // 10 * 14 = 140 frames of loop
  const hit = Math.min(Math.floor(frame / BEAT), HITS - 1);
  const localFrame = frame - hit * BEAT;
  const isCommande = hit % 2 === 0;

  // per-hit pop
  const pop = spring({
    frame: localFrame,
    fps,
    config: { damping: 12, stiffness: 220 },
  });
  const scale = interpolate(pop, [0, 1], [0.55, 1]);

  // small deterministic position shuffle per hit
  const dx = (rnd(hit, 11) - 0.5) * 90;
  const dy = (rnd(hit, 12) - 0.5) * 70;
  const rot = (rnd(hit, 13) - 0.5) * 8;

  const label = isCommande ? "commande 🛵" : "wsel ✅";
  const accent = isCommande ? CORAL : EMERALD;

  // city ticker advances every beat
  const city = CITIES[hit % CITIES.length];
  const cityPop = spring({
    frame: localFrame,
    fps,
    config: { damping: 14, stiffness: 160 },
  });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {/* relentless "lkhdma" word stamping above */}
      <div
        style={{
          position: "absolute",
          top: 360,
          color: "rgba(255,255,255,0.85)",
          fontSize: 54,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: 4,
          textTransform: "uppercase",
          transform: `scale(${interpolate(pop, [0, 1], [1.25, 1])})`,
          opacity: interpolate(localFrame, [0, 4, BEAT - 2], [0.4, 1, 0.7], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        lkhdma lkhdma
      </div>

      {/* the big beat-stamped status pill */}
      <div
        style={{
          transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(${rot}deg)`,
        }}
      >
        <div
          style={{
            background: "#fff",
            color: accent,
            fontSize: 132,
            fontWeight: 900,
            fontFamily: FONT,
            letterSpacing: -3,
            padding: "34px 70px",
            borderRadius: 56,
            boxShadow: "0 30px 70px rgba(0,0,0,0.35)",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      </div>

      {/* city ticker underneath */}
      <div
        style={{
          position: "absolute",
          bottom: 380,
          display: "flex",
          alignItems: "center",
          gap: 16,
          transform: `translateY(${interpolate(cityPop, [0, 1], [22, 0])}px)`,
          opacity: interpolate(cityPop, [0, 1], [0.3, 1]),
        }}
      >
        <Pin size={56} color="#fff" />
        <div
          style={{
            color: "#fff",
            fontSize: 64,
            fontWeight: 900,
            fontFamily: FONT,
            letterSpacing: -1,
          }}
        >
          {city}
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: 64,
            fontWeight: 900,
            fontFamily: FONT,
          }}
        >
          …
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ------------------ BEAT 3: EARNINGS COUNTER (150–300, overlaps) ------------------ *
 *  A big tabular number ticking 0 → ~240 dh in sync with the beat.
 *  Starts during the back half of the grind, persists through the payoff.
 * ------------------------------------------------------------------------------- */
const Earnings: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // local frame 0 == global 150. Count up over 110 frames then hold.
  const raw = interpolate(frame, [0, 110], [0, 240], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  // quantize to the beat so the number "kicks" with each lkhdma
  const beatStep = Math.floor((frame + 150) / BEAT);
  const beatLocal = frame + 150 - beatStep * BEAT;
  const kick = spring({
    frame: beatLocal,
    fps,
    config: { damping: 11, stiffness: 240 },
  });
  const value = Math.round(raw);
  const intro = fadeUp(frame, 0, 14, 30);
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 200,
      }}
    >
      <div
        style={{
          ...intro,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `${intro.transform ?? ""} scale(${interpolate(
            kick,
            [0, 1],
            [1.08, 1]
          )})`,
        }}
      >
        <div
          style={{
            color: "rgba(255,255,255,0.9)",
            fontSize: 40,
            fontWeight: 900,
            letterSpacing: 5,
            fontFamily: FONT,
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          l-flouss 💸
        </div>
        <div
          style={{
            color: "#fff",
            fontSize: 156,
            fontWeight: 900,
            fontFamily: FONT,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: -4,
            lineHeight: 1,
            textShadow: "0 14px 40px rgba(0,0,0,0.3)",
          }}
        >
          {value} dh
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* --------------------------- BEAT 4: PAYOFF (300–340) --------------------------- */
const Payoff: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          transform: `scale(${interpolate(pop, [0, 1], [0.7, 1])})`,
          color: "#fff",
          fontSize: 124,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -3,
          textAlign: "center",
          lineHeight: 1.04,
          padding: "0 50px",
        }}
      >
        lkhdma
        <br />
        kat5alless 💪
      </div>
      <div style={{ marginTop: 44 }}>
        <Chip label="khdem foqach bghiti" color={EMERALD} delay={14} size={50} />
      </div>
    </AbsoluteFill>
  );
};

/* ----------------------------- BEAT 5: CTA (340–360) ----------------------------- */
const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${0.5 + pop * 0.5})` }}>
        <AppIcon size={210} />
      </div>
      <div
        style={{
          ...fadeUp(frame, 8, 12, 24),
          marginTop: 44,
          background: "#fff",
          color: CORAL,
          fontSize: 50,
          fontWeight: 900,
          fontFamily: FONT,
          padding: "26px 56px",
          borderRadius: 999,
          textAlign: "center",
          boxShadow: "0 16px 40px rgba(0,0,0,0.25)",
        }}
      >
        AtlaasGo Driver · wlla rider daba
      </div>
    </AbsoluteFill>
  );
};

export const KhdmaClip: React.FC = () => (
  <AbsoluteFill style={coralBg}>
    <Glow />
    <Sequence durationInFrames={60}>
      <Hook />
    </Sequence>
    <Sequence from={60} durationInFrames={150}>
      <GrindLoop />
    </Sequence>
    <Sequence from={150} durationInFrames={150}>
      <Earnings />
    </Sequence>
    <Sequence from={300} durationInFrames={40}>
      <Payoff />
    </Sequence>
    <Sequence from={340} durationInFrames={20}>
      <CTA />
    </Sequence>
  </AbsoluteFill>
);

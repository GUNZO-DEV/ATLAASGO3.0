import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { CORAL, CREAM, FONT, AppIcon } from "./brand";

/* ──────────────────────────────────────────────────────────────────────────
   RangeClip — the HERO "our range" clip.
   AtlaasGo delivers to ALL Moroccan cities, not just the big ones.
   1080x1920 · 30fps · ~360 frames · SILENT (add a trending sound in TikTok).
   ────────────────────────────────────────────────────────────────────────── */

/* ── Atlas-toned dark base with soft radial glows + drifting orbs ─────────── */
const atlasBg: React.CSSProperties = {
  background:
    "radial-gradient(120% 90% at 50% 8%, #2A2018 0%, #1A1410 48%, #0E0B08 100%)",
};

const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  // gentle continuous parallax drift on the glow layers
  const driftA = Math.sin(frame * 0.012) * 60;
  const driftB = Math.cos(frame * 0.009) * 50;
  return (
    <AbsoluteFill>
      {/* warm coral glow, top */}
      <div
        style={{
          position: "absolute",
          left: 540 + driftA,
          top: 120 + driftB * 0.6,
          width: 1100,
          height: 1100,
          marginLeft: -550,
          marginTop: -550,
          borderRadius: 999,
          background:
            "radial-gradient(circle, rgba(255,87,34,0.30) 0%, rgba(255,87,34,0) 62%)",
          filter: "blur(20px)",
        }}
      />
      {/* amber glow, lower */}
      <div
        style={{
          position: "absolute",
          left: 540 - driftB,
          top: 1500 + driftA * 0.5,
          width: 1200,
          height: 1200,
          marginLeft: -600,
          marginTop: -600,
          borderRadius: 999,
          background:
            "radial-gradient(circle, rgba(198,107,31,0.26) 0%, rgba(198,107,31,0) 60%)",
          filter: "blur(24px)",
        }}
      />
      {/* vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(120% 100% at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

/* ── City model ──────────────────────────────────────────────────────────
   Positions are within the stylized map panel (local coords, MAP_W×MAP_H). */
const MAP_W = 936;
const MAP_H = 1180;

type City = {
  name: string;
  x: number;
  y: number;
  hero: boolean; // hero = ignites in CORAL with a pulse
  emoji?: string;
  igniteAt: number; // frame (local to map scene) when it lights up
  small?: boolean; // smaller supporting pin
};

// Rough geographic-ish layout on the panel:
// Casa left, Rabat upper-left, Marrakech lower-left, Ifrane center,
// Taourirt right, Oujda far-right.
const CITIES: City[] = [
  { name: "Rabat", x: 250, y: 300, hero: false, igniteAt: 8 },
  { name: "Casablanca", x: 190, y: 470, hero: false, igniteAt: 14 },
  { name: "Marrakech", x: 300, y: 840, hero: false, igniteAt: 20 },
  { name: "Ifrane", x: 500, y: 560, hero: true, emoji: "❄️", igniteAt: 78 },
  { name: "Taourirt", x: 720, y: 470, hero: true, emoji: "☀️", igniteAt: 96 },
  { name: "Oujda", x: 850, y: 540, hero: false, small: true, igniteAt: 120 },
  { name: "Errachidia", x: 600, y: 880, hero: false, small: true, igniteAt: 132 },
];

/* ── A glowing map pin that ignites on a spring, then pulses ──────────────── */
const MapPin: React.FC<{
  city: City;
  localFrame: number;
}> = ({ city, localFrame }) => {
  const { fps } = useVideoConfig();
  const t = localFrame - city.igniteAt;
  const pop = spring({
    frame: t,
    fps,
    config: { damping: 13, mass: 0.7 },
  });
  if (t < -2) return null;

  const appear = interpolate(t, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const baseColor = city.hero ? CORAL : "rgba(255,255,255,0.92)";
  const r = city.small ? 13 : city.hero ? 22 : 17;

  // continuous pulse ring (hero pins glow stronger)
  const pulseT = (t % 42) / 42;
  const pulseR = interpolate(pulseT, [0, 1], [r, r + (city.hero ? 60 : 34)]);
  const pulseOp = interpolate(pulseT, [0, 1], [city.hero ? 0.6 : 0.32, 0]);

  const scale = 0.5 + pop * 0.5;

  return (
    <div
      style={{
        position: "absolute",
        left: city.x,
        top: city.y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity: appear,
      }}
    >
      {/* pulse ring */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: pulseR * 2,
          height: pulseR * 2,
          marginLeft: -pulseR,
          marginTop: -pulseR,
          borderRadius: 999,
          border: `${city.hero ? 5 : 3}px solid ${
            city.hero ? CORAL : "#fff"
          }`,
          opacity: pulseOp,
        }}
      />
      {/* glow halo */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: r * 5,
          height: r * 5,
          marginLeft: -r * 2.5,
          marginTop: -r * 2.5,
          borderRadius: 999,
          background: city.hero
            ? `radial-gradient(circle, ${CORAL}88 0%, ${CORAL}00 65%)`
            : "radial-gradient(circle, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 65%)",
        }}
      />
      {/* dot */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: r * 2,
          height: r * 2,
          marginLeft: -r,
          marginTop: -r,
          borderRadius: 999,
          background: baseColor,
          border: `${city.hero ? 5 : 4}px solid #fff`,
          boxShadow: city.hero
            ? `0 0 30px ${CORAL}, 0 8px 20px rgba(0,0,0,0.4)`
            : "0 6px 16px rgba(0,0,0,0.45)",
        }}
      />
      {/* label */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: r + 14,
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
          color: city.hero ? "#fff" : "rgba(255,255,255,0.9)",
          background: city.hero ? `${CORAL}` : "rgba(20,16,12,0.55)",
          fontSize: city.small ? 26 : city.hero ? 38 : 30,
          fontWeight: city.hero ? 900 : 700,
          fontFamily: FONT,
          letterSpacing: -0.5,
          padding: city.small ? "6px 14px" : "8px 18px",
          borderRadius: 999,
          boxShadow: city.hero
            ? `0 10px 26px ${CORAL}66`
            : "0 6px 16px rgba(0,0,0,0.35)",
          backdropFilter: "blur(2px)",
        }}
      >
        {city.emoji ? `${city.emoji} ` : ""}
        {city.name}
      </div>
    </div>
  );
};

/* ── The stylized Morocco map panel (the visual centerpiece) ─────────────── */
const MapPanel: React.FC<{ localFrame: number; showRoute: boolean }> = ({
  localFrame,
  showRoute,
}) => {
  // subtle animated grid lines like AtlaasGoPromo's map
  const gridShift = (localFrame * 0.5) % 90;

  const ifrane = CITIES.find((c) => c.name === "Ifrane")!;
  const taourirt = CITIES.find((c) => c.name === "Taourirt")!;

  // route draws between Ifrane → Taourirt after both ignite
  const routeProg = interpolate(localFrame, [108, 138], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const rx = ifrane.x + (taourirt.x - ifrane.x) * routeProg;
  const ry = ifrane.y + (taourirt.y - ifrane.y) * routeProg;
  const routeLen = Math.hypot(taourirt.x - ifrane.x, taourirt.y - ifrane.y);

  return (
    <div
      style={{
        position: "relative",
        width: MAP_W,
        height: MAP_H,
        borderRadius: 64,
        overflow: "hidden",
        background:
          "linear-gradient(165deg, #241B14 0%, #1B140F 55%, #120D09 100%)",
        boxShadow:
          "0 40px 120px rgba(0,0,0,0.55), inset 0 0 0 2px rgba(255,255,255,0.05), inset 0 0 80px rgba(255,87,34,0.08)",
      }}
    >
      {/* animated grid */}
      <svg
        width={MAP_W}
        height={MAP_H}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={CORAL} stopOpacity="0.4" />
            <stop offset="100%" stopColor={CORAL} stopOpacity="1" />
          </linearGradient>
        </defs>
        {Array.from({ length: 14 }).map((_, i) => {
          const y = i * 90 + gridShift - 90;
          return (
            <line
              key={`h${i}`}
              x1={0}
              y1={y}
              x2={MAP_W}
              y2={y}
              stroke="#FF5722"
              strokeWidth={1.5}
              opacity={0.07}
            />
          );
        })}
        {Array.from({ length: 11 }).map((_, i) => {
          const x = i * 90 + gridShift - 90;
          return (
            <line
              key={`v${i}`}
              x1={x}
              y1={0}
              x2={x}
              y2={MAP_H}
              stroke="#FF5722"
              strokeWidth={1.5}
              opacity={0.07}
            />
          );
        })}

        {/* drawn glowing route Ifrane → Taourirt */}
        {showRoute && routeProg > 0 && (
          <>
            <line
              x1={ifrane.x}
              y1={ifrane.y}
              x2={taourirt.x}
              y2={taourirt.y}
              stroke={CORAL}
              strokeWidth={9}
              strokeLinecap="round"
              strokeDasharray={routeLen}
              strokeDashoffset={routeLen * (1 - routeProg)}
              opacity={0.85}
              style={{ filter: `drop-shadow(0 0 10px ${CORAL})` }}
            />
            {/* travelling rider dot along the route */}
            <circle cx={rx} cy={ry} r={14} fill="#fff" />
            <circle cx={rx} cy={ry} r={9} fill={CORAL} />
          </>
        )}
      </svg>

      {/* pins */}
      {CITIES.map((c) => (
        <MapPin key={c.name} city={c} localFrame={localFrame} />
      ))}
    </div>
  );
};

/* ── A big bold darija caption pinned near the top, over the map ──────────── */
const Caption: React.FC<{
  lines: { text: string; color?: string }[];
  delay: number;
}> = ({ lines, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - delay, fps, config: { damping: 14 } });
  const opacity = interpolate(frame, [delay, delay + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        opacity,
        transform: `translateY(${(1 - pop) * 30}px)`,
        textAlign: "center",
        padding: "0 56px",
      }}
    >
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            color: l.color ?? "#fff",
            fontSize: 64,
            fontWeight: 900,
            fontFamily: FONT,
            letterSpacing: -2,
            lineHeight: 1.08,
            textShadow: "0 6px 30px rgba(0,0,0,0.55)",
          }}
        >
          {l.text}
        </div>
      ))}
    </div>
  );
};

/* ── MAP SCENE — the long centerpiece (beats 1–4 narrated over the map) ──── */
const MapScene: React.FC = () => {
  const frame = useCurrentFrame();

  // map panel entrance: slide up + scale settle
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 16, mass: 0.9 } });
  const mapY = interpolate(enter, [0, 1], [120, 0]);
  const mapScale = interpolate(enter, [0, 1], [0.92, 1]);
  // gentle continuous breathing parallax
  const breathe = Math.sin(frame * 0.02) * 6;

  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      {/* Top captions swap across beats */}
      <div style={{ position: "absolute", top: 96, width: "100%", zIndex: 5 }}>
        <Sequence durationInFrames={74} layout="none">
          <Caption
            delay={4}
            lines={[
              { text: "Casa, Rabat, Marrakech…" },
              { text: "3andhom kolchi.", color: "rgba(255,255,255,0.78)" },
            ]}
          />
        </Sequence>
        <Sequence from={74} durationInFrames={70} layout="none">
          <Caption
            delay={4}
            lines={[
              { text: "w blassa dyalek?" },
              { text: "Taourirt? Ifrane?", color: CORAL },
              { text: "lemden sghar?", color: "rgba(255,255,255,0.8)" },
            ]}
          />
        </Sequence>
        <Sequence from={144} durationInFrames={86} layout="none">
          <Caption
            delay={4}
            lines={[
              { text: "AtlaasGo kaywsel l GA3", color: CORAL },
              { text: "machi ghir lekbar 🇲🇦" },
            ]}
          />
        </Sequence>
      </div>

      {/* Map panel */}
      <div
        style={{
          position: "absolute",
          top: 430 + breathe,
          transform: `translateY(${mapY}px) scale(${mapScale})`,
        }}
      >
        <MapPanel localFrame={frame} showRoute />
      </div>
    </AbsoluteFill>
  );
};

/* ── BRIDGE SCENE — "men telj Ifrane ❄️ l chems Taourirt ☀️" ─────────────── */
const Bridge: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const left = spring({ frame: frame - 4, fps, config: { damping: 14 } });
  const right = spring({ frame: frame - 16, fps, config: { damping: 14 } });
  const scooter = interpolate(frame, [10, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const bob = Math.sin(frame * 0.3) * 8;

  const Card: React.FC<{
    s: number;
    emoji: string;
    label: string;
    sub: string;
    align: "flex-start" | "flex-end";
  }> = ({ s, emoji, label, sub, align }) => (
    <div
      style={{
        alignSelf: align,
        transform: `scale(${0.6 + s * 0.4})`,
        opacity: Math.min(s * 1.4, 1),
        background: "rgba(255,255,255,0.06)",
        border: "2px solid rgba(255,255,255,0.12)",
        borderRadius: 44,
        padding: "34px 46px",
        boxShadow: `0 24px 60px rgba(0,0,0,0.45), inset 0 0 50px ${CORAL}14`,
        backdropFilter: "blur(4px)",
        textAlign: align === "flex-start" ? "left" : "right",
      }}
    >
      <div style={{ fontSize: 96, lineHeight: 1 }}>{emoji}</div>
      <div
        style={{
          color: "#fff",
          fontSize: 70,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -2,
          marginTop: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: "rgba(255,255,255,0.7)",
          fontSize: 36,
          fontWeight: 700,
          fontFamily: FONT,
          marginTop: 4,
        }}
      >
        {sub}
      </div>
    </div>
  );

  return (
    <AbsoluteFill
      style={{ justifyContent: "center", padding: "0 70px", gap: 60 }}
    >
      <Card
        s={left}
        emoji="❄️"
        label="men telj Ifrane"
        sub="−3°C w 7na jayin"
        align="flex-start"
      />

      {/* scooter travelling between the two */}
      <div style={{ position: "relative", height: 80 }}>
        <div
          style={{
            position: "absolute",
            left: `${scooter * 78}%`,
            top: bob,
            fontSize: 86,
            filter: `drop-shadow(0 8px 16px ${CORAL}66)`,
          }}
        >
          🛵💨
        </div>
        {/* trail line */}
        <div
          style={{
            position: "absolute",
            top: 46,
            left: 0,
            width: `${scooter * 82}%`,
            height: 6,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${CORAL}00, ${CORAL})`,
          }}
        />
      </div>

      <Card
        s={right}
        emoji="☀️"
        label="l chems Taourirt"
        sub="7na 3andek"
        align="flex-end"
      />
    </AbsoluteFill>
  );
};

/* ── CTA SCENE — AppIcon + pill "AtlaasGo · bladek kamla" ─────────────────── */
const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 13, mass: 0.8 } });
  const bob = Math.sin(frame * 0.12) * 8;
  // soft screen-glow behind the icon
  const glowPulse = 0.5 + Math.sin(frame * 0.12) * 0.18;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {/* screen-glow behind icon */}
      <div
        style={{
          position: "absolute",
          width: 760,
          height: 760,
          borderRadius: 999,
          background: `radial-gradient(circle, ${CORAL}55 0%, ${CORAL}00 62%)`,
          opacity: glowPulse,
          filter: "blur(10px)",
        }}
      />
      <div
        style={{
          transform: `scale(${0.6 + pop * 0.4}) translateY(${bob}px)`,
        }}
      >
        <AppIcon size={300} />
      </div>
      <div
        style={{
          opacity: interpolate(frame, [12, 26], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `translateY(${interpolate(
            spring({ frame: frame - 12, fps, config: { damping: 14 } }),
            [0, 1],
            [40, 0]
          )}px)`,
          marginTop: 64,
          color: "#fff",
          fontSize: 124,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -4,
          textShadow: "0 8px 40px rgba(0,0,0,0.5)",
        }}
      >
        AtlaasGo
      </div>
      <div
        style={{
          opacity: interpolate(frame, [26, 40], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `scale(${
            0.8 + Math.min(spring({ frame: frame - 26, fps, config: { damping: 12 } }), 1) * 0.2
          })`,
          marginTop: 44,
          background: CREAM,
          color: CORAL,
          fontSize: 54,
          fontWeight: 900,
          fontFamily: FONT,
          letterSpacing: -1,
          padding: "30px 70px",
          borderRadius: 999,
          boxShadow: `0 22px 60px ${CORAL}55`,
        }}
      >
        bladek kamla 🇲🇦
      </div>
    </AbsoluteFill>
  );
};

/* ── Main composition — 360 frames @ 30fps = 12s ─────────────────────────── */
export const RangeClip: React.FC = () => {
  return (
    <AbsoluteFill style={atlasBg}>
      <Backdrop />
      <Sequence durationInFrames={230}>
        <MapScene />
      </Sequence>
      <Sequence from={230} durationInFrames={70}>
        <Bridge />
      </Sequence>
      <Sequence from={300} durationInFrames={60}>
        <CTA />
      </Sequence>
    </AbsoluteFill>
  );
};

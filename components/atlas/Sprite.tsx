// components/atlas/Sprite.tsx
"use client";

import { SPRITES, SPRITE_SRC, SRC_DIMS } from "./sprites";

interface SpriteProps {
  /** Sprite ID, e.g. "cat:tagine", "dish:pastilla", "rest:darnaji" */
  id: string;
  /** Display width in px */
  width: number;
  /** Display height in px */
  height: number;
  /** Border radius in px (default 0) */
  radius?: number;
  className?: string;
}

/**
 * Renders a fixed-size crop of a source sprite-sheet image via CSS
 * background-position. This avoids loading dozens of individual images —
 * one sprite sheet per category is loaded and cached.
 */
export default function Sprite({ id, width, height, radius = 0, className }: SpriteProps) {
  const slice = SPRITES[id];
  if (!slice) return null;

  const [srcKey, sx, sy, sw, sh] = slice;
  const src = SPRITE_SRC[srcKey];
  const [srcW, srcH] = SRC_DIMS[srcKey] ?? [2816, 1536];

  // Scale source so (sw, sh) maps onto (width, height) as cover
  const scale = Math.max(width / sw, height / sh);
  const bgW = srcW * scale;
  const bgH = srcH * scale;
  const cropW = sw * scale;
  const cropH = sh * scale;
  const cx = (width - cropW) / 2;
  const cy = (height - cropH) / 2;

  return (
    <div
      className={className}
      role="img"
      style={{
        width,
        height,
        borderRadius: radius,
        overflow: "hidden",
        backgroundImage: `url(${src})`,
        backgroundSize: `${bgW}px ${bgH}px`,
        backgroundPosition: `${-sx * scale + cx}px ${-sy * scale + cy}px`,
        backgroundRepeat: "no-repeat",
        flexShrink: 0,
      }}
    />
  );
}

// components/atlas/RestaurantSprite.tsx
// Fluid-width sprite for restaurant banners inside grid/flex containers.
// Uses percentage-based background-position so it scales naturally.
"use client";

import { SPRITES, SPRITE_SRC, SRC_DIMS } from "./sprites";
import RestaurantBanner from "./RestaurantBanner";

interface RestaurantSpriteProps {
  id: string;
  height: number;
  radius?: number;
  className?: string;
}

export function RestaurantSprite({ id, height, radius = 0, className }: RestaurantSpriteProps) {
  const slice = SPRITES[id];
  if (!slice) return <RestaurantBanner hue={18} height={height} />;

  const [srcKey, sx, sy, sw, sh] = slice;
  const src = SPRITE_SRC[srcKey];
  const [srcW, srcH] = SRC_DIMS[srcKey] ?? [2816, 1536];

  // Express crop as percentages so it fills any container width
  const bgPosX  = sw < srcW ? (sx / (srcW - sw)) * 100 : 0;
  const bgPosY  = sh < srcH ? (sy / (srcH - sh)) * 100 : 0;
  const bgSizeX = (srcW / sw) * 100;
  const bgSizeY = (srcH / sh) * 100;

  return (
    <div
      className={className}
      style={{
        width: "100%",
        height,
        borderRadius: radius,
        overflow: "hidden",
        backgroundImage: `url(${src})`,
        backgroundSize: `${bgSizeX}% ${bgSizeY}%`,
        backgroundPosition: `${bgPosX}% ${bgPosY}%`,
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}

export default RestaurantSprite;

// Atlaas Go — Image sprite system
// Source PNGs are 2816×1536 grids. Sprite component crops the right region.

export const SPRITE_SRC: Record<string, string> = {
  cats: "/images/src-categories.png",
  cats2: "/images/src-categories2.png",
  dishes: "/images/src-dishes.png",
  rests: "/images/src-restaurants.png",
  hero: "/images/src-hero.png",
  avatars: "/images/src-avatars.png",
  map: "/images/src-map.png",
};

export const SRC_DIMS: Record<string, [number, number]> = {
  cats: [2816, 1536],
  cats2: [1408, 768],
  dishes: [2816, 1536],
  rests: [2816, 1536],
  hero: [2816, 1536],
  avatars: [1456, 720],
  map: [2816, 1536],
};

// Slice coordinates: [srcKey, sx, sy, sw, sh]
export type SpriteSlice = [string, number, number, number, number];

export const SPRITES: Record<string, SpriteSlice> = {
  // Categories (3×3 grid in src-categories)
  "cat:tagine": ["cats", 430, 100, 740, 600],
  "cat:couscous": ["cats", 1140, 100, 740, 600],
  "cat:sandwich": ["cats", 1820, 100, 880, 600],
  "cat:patisserie": ["cats", 430, 580, 740, 600],
  "cat:atay": ["cats", 1180, 580, 660, 600],
  "cat:pizza": ["cats", 1810, 580, 830, 600],
  "cat:petitdej": ["cats", 430, 1020, 740, 510],
  "cat:healthy": ["cats", 1180, 1020, 660, 510],
  "cat:grill": ["cats", 1810, 1020, 830, 510],

  // Categories — second grid (5×2 in src-categories2 = 1408×768)
  "cat:friture": ["cats2", 0, 0, 282, 260],
  "cat:rotisserie": ["cats2", 281, 0, 282, 260],
  "cat:zaazaa": ["cats2", 563, 0, 282, 260],
  "cat:boulangerie": ["cats2", 844, 0, 282, 260],
  "cat:international": ["cats2", 1126, 0, 282, 260],
  "cat:marche": ["cats2", 0, 384, 282, 260],
  "cat:poissonnerie": ["cats2", 281, 384, 282, 260],
  "cat:boucherie": ["cats2", 563, 384, 282, 260],
  "cat:epicerie": ["cats2", 844, 384, 282, 260],
  "cat:maison": ["cats2", 1126, 384, 282, 260],

  // Avatars (4×2 in src-avatars 1456×720)
  "avatar:youssef": ["avatars", 10, 10, 344, 340],
  "avatar:ahmed": ["avatars", 374, 10, 344, 340],
  "avatar:salma": ["avatars", 738, 10, 344, 340],
  "avatar:leila": ["avatars", 1102, 10, 344, 340],
  "avatar:nadia": ["avatars", 10, 370, 344, 340],
  "avatar:karim": ["avatars", 374, 370, 344, 340],
  "avatar:omar": ["avatars", 738, 370, 344, 340],
  "avatar:hicham": ["avatars", 1102, 370, 344, 340],

  // Dishes — 5×3 grid, skip top 110px label band per tile
  "dish:tagine-poulet": ["dishes", 0, 110, 563, 402],
  "dish:couscous-royal": ["dishes", 563, 110, 563, 402],
  "dish:pastilla": ["dishes", 1126, 110, 563, 402],
  "dish:harira": ["dishes", 0, 622, 563, 402],
  "dish:camel-burger": ["dishes", 563, 622, 563, 402],
  "dish:msemen": ["dishes", 1126, 622, 563, 402],
  "dish:atay": ["dishes", 1689, 622, 563, 402],
  "dish:chebakia": ["dishes", 2252, 622, 563, 402],
  "dish:tanjia": ["dishes", 0, 1134, 563, 402],
  "dish:tagine-kefta": ["dishes", 563, 1134, 563, 402],
  "dish:briouates": ["dishes", 1126, 1134, 563, 402],
  "dish:bowl-baladi": ["dishes", 1689, 1134, 563, 402],
  "dish:jus-orange": ["dishes", 2252, 1134, 563, 402],

  // Restaurants — 3×2, skip 160px label band per tile
  "rest:darnaji": ["rests", 0, 160, 939, 608],
  "rest:cafeclock": ["rests", 939, 160, 939, 608],
  "rest:snacktanjia": ["rests", 1878, 160, 939, 608],
  "rest:atayco": ["rests", 0, 928, 939, 608],
  "rest:riadmogador": ["rests", 939, 928, 939, 608],
  "rest:baladi": ["rests", 1878, 928, 939, 608],

  // Hero floating cards — isolated dish regions from src-hero
  "hero:tagine": ["hero", 330, 140, 970, 1000],
  "hero:pastilla": ["hero", 930, 470, 920, 1000],
  "hero:atay": ["hero", 1700, 100, 950, 1100],
};

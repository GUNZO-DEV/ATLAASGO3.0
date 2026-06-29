/* ──────────────────────────────────────────────────────────────────────────
 * TikTok marketing campaign — video manifest
 *
 * The Atlaasgo brand TikTok videos live as files under `public/marketing/`.
 * Drop the exported `.mp4` files there (and an optional `.jpg` poster with the
 * same name) and reference them below. The admin Marketing tab reads this list
 * and renders a 9:16 gallery, so editing this file is all it takes to publish a
 * new clip to the campaign view.
 *
 * `src` / `poster` are resolved from the site root, e.g. a file saved at
 * `public/marketing/ramadan-launch.mp4` is referenced as `/marketing/ramadan-launch.mp4`.
 * ────────────────────────────────────────────────────────────────────────── */

export type CampaignStatus = 'live' | 'scheduled' | 'draft';

export interface TikTokVideo {
  id: string;
  /** Short internal title shown in the admin grid. */
  title: string;
  /** The caption as posted on TikTok. */
  caption: string;
  /** Path under public/, e.g. /marketing/ramadan-launch.mp4 */
  src: string;
  /** Optional poster frame under public/, e.g. /marketing/ramadan-launch.jpg */
  poster?: string;
  /** City / market the clip targets (no taxi content — delivery only). */
  city: string;
  hashtags: string[];
  status: CampaignStatus;
  /** ISO date the clip went / goes live. */
  publishedAt: string;
  /** Reported performance — fill in from TikTok analytics. */
  stats: {
    views: number;
    likes: number;
    shares: number;
  };
}

/**
 * Campaign: "Atlaasgo — La livraison marocaine" (summer 2026).
 * Seed entries below; replace the placeholder file names with your real exports.
 */
export const TIKTOK_CAMPAIGN: TikTokVideo[] = [
  {
    id: 'atl-tt-01',
    title: 'Launch teaser',
    caption: 'La livraison marocaine, pensée pour les Marocains. 🇲🇦 #Atlaasgo',
    src: '/marketing/launch-teaser.mp4',
    poster: '/marketing/launch-teaser.jpg',
    city: 'Casablanca',
    hashtags: ['Atlaasgo', 'Livraison', 'Casablanca', 'Maroc'],
    status: 'live',
    publishedAt: '2026-06-01',
    stats: { views: 0, likes: 0, shares: 0 },
  },
  {
    id: 'atl-tt-02',
    title: 'Rider story',
    caption: 'Une journée avec nos livreurs Atlaasgo. 🛵💚 #DeliveryHeroes',
    src: '/marketing/rider-story.mp4',
    poster: '/marketing/rider-story.jpg',
    city: 'Rabat',
    hashtags: ['Atlaasgo', 'Livreur', 'Rabat'],
    status: 'live',
    publishedAt: '2026-06-08',
    stats: { views: 0, likes: 0, shares: 0 },
  },
  {
    id: 'atl-tt-03',
    title: 'Restaurant spotlight',
    caption: 'Vos plats préférés, livrés chauds. 🍲 #FoodieMaroc #Atlaasgo',
    src: '/marketing/restaurant-spotlight.mp4',
    poster: '/marketing/restaurant-spotlight.jpg',
    city: 'Marrakech',
    hashtags: ['Atlaasgo', 'Foodie', 'Marrakech'],
    status: 'scheduled',
    publishedAt: '2026-07-02',
    stats: { views: 0, likes: 0, shares: 0 },
  },
];

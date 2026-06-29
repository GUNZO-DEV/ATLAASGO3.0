# Marketing video drop-in folder

Put the Atlaasgo TikTok campaign videos here, then reference them from
`src/data/tiktokCampaign.ts`. The admin **Marketing** tab renders everything
listed in that file as a 9:16 gallery.

## How to add a clip

1. Export the video as `.mp4` (H.264) and, optionally, a poster frame as `.jpg`
   with the **same base name**:

   ```
   public/marketing/launch-teaser.mp4
   public/marketing/launch-teaser.jpg   # optional poster
   ```

2. Add (or edit) an entry in `src/data/tiktokCampaign.ts`:

   ```ts
   {
     id: 'atl-tt-04',
     title: 'Summer promo',
     caption: '-30% ce week-end. 🍔 #Atlaasgo',
     src: '/marketing/summer-promo.mp4',
     poster: '/marketing/summer-promo.jpg',
     city: 'Tanger',
     hashtags: ['Atlaasgo', 'Promo'],
     status: 'live',
     publishedAt: '2026-07-10',
     stats: { views: 0, likes: 0, shares: 0 },
   }
   ```

3. Open `/admin` → **Marketing** tab to preview the campaign.

## Notes

- Files in `public/` are served from the site root, so
  `public/marketing/x.mp4` is referenced as `/marketing/x.mp4`.
- Keep clips vertical (9:16) to match the TikTok format and the gallery layout.
- Large video files should usually live on a CDN; for a handful of short promo
  clips, committing them here is fine.

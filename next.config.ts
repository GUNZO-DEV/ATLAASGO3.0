import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Leaflet's CSS (which uses url() for marker images) is
  // processed correctly by Next.js on all platforms including mobile.
  transpilePackages: ["leaflet", "react-leaflet"],
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://us-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;

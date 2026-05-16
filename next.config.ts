import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: ["leaflet", "react-leaflet"],
  images: {
    unoptimized: true, // Required for static export
  },
  // Turbopack config for dev mode
  turbopack: {
    root: __dirname,
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;

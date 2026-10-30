import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a phone on the same Wi-Fi open the dev server (http://192.168.x.x:3000).
  // Development only: production builds ignore it.
  allowedDevOrigins: ["192.168.*.*"],
  // Hides the floating "N" badge. Errors still show without it.
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

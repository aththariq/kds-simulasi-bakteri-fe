import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",

  // External packages that should be handled by the server
  serverExternalPackages: ["sharp"],

  // Image optimization configuration
  images: {
    unoptimized: true, // Required for standalone deployment
  },

  // Environment variables that should be available at build time
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

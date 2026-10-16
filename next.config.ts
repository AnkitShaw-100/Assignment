import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle, enabled only for the Docker image build
  // (`next start` does not support standalone output).
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  cacheComponents: true,
  partialPrefetching: true,
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

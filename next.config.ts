import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Force new build ID to invalidate all caches
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
};

export default nextConfig;

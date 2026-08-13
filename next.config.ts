import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hides the floating dev-tools badge. Dev-only UI; it never shipped to prod.
  devIndicators: false,
};

export default nextConfig;

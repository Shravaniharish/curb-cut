import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Small self-contained server for the container image.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;

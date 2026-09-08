import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray package-lock.json further up the drive otherwise drags Turbopack's
  // inferred workspace root outside this project.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;

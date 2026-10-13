import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. Without it, Next.js picks up the
  // stray ~/package-lock.json and treats the entire home directory as the
  // root, so Turbopack watches/scans everything under ~ and pegs the CPU.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` would otherwise rewrite AGENTS.md with its own block; AGENTS.md already points
  // agents at the version-matched docs in node_modules/next/dist/docs/.
  agentRules: false,
};

export default nextConfig;

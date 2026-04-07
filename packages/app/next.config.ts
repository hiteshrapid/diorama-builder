import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@diorama/engine", "@diorama/plugins", "@diorama/ui"],
  serverExternalPackages: ["ws"],
};

export default nextConfig;

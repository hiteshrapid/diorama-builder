import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@diorama/engine", "@diorama/plugins", "@diorama/ui"],
};

export default nextConfig;

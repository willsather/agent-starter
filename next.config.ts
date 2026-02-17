import { withVercelToolbar } from "@vercel/toolbar/plugins/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bash-tool", "@vercel/sandbox"],
};

export default withVercelToolbar()(nextConfig);

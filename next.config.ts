import { withVercelToolbar } from "@vercel/toolbar/plugins/next";
import { withAsh } from "experimental-ash/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default withAsh(withVercelToolbar()(nextConfig));

import { withVercelToolbar } from "@vercel/toolbar/plugins/next";
import { withEve } from "eve/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default withEve(withVercelToolbar()(nextConfig));

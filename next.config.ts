import { withVercelToolbar } from "@vercel/toolbar/plugins/next";
import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {};

const toolbarConfig = withVercelToolbar()(nextConfig);
const workflowConfig = withWorkflow(toolbarConfig);

export default workflowConfig;

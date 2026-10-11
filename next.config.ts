import type { NextConfig } from "next";

// Photos upload straight from the browser to Supabase Storage, so no large request bodies reach Next.js.
const nextConfig: NextConfig = {};

export default nextConfig;

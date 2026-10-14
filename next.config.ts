import type { NextConfig } from "next";

// Publicação estática (GitHub Pages): STATIC_EXPORT=1 gera a pasta out/ e NEXT_PUBLIC_BASE_PATH define a subpasta
// (ex.: /gustaluthier). Sem essas variáveis, dev e `next start` funcionam como antes.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  images: { unoptimized: true },
  ...(process.env.STATIC_EXPORT ? { output: "export" as const } : {}),
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;

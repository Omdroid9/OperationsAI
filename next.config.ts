import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow ngrok / tunnel origins to load dev chunks (Next.js blocks cross-origin dev assets by default).
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app", "*.ngrok.io"],
  transpilePackages: ["@astryxdesign/core", "@astryxdesign/theme-neutral"],
  // Native canvas bindings must stay external for Node route builds (Vercel / Turbopack).
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist"],
  async redirects() {
    return [
      { source: "/services", destination: "/#modules", permanent: false },
      { source: "/how-skyos-works", destination: "/#loop", permanent: false },
      { source: "/about", destination: "/#about", permanent: false },
      { source: "/faq", destination: "/#faq", permanent: false },
      { source: "/consultation", destination: "/#cta", permanent: false },
      { source: "/guide", destination: "/#modules", permanent: false },
      { source: "/fonts-preview", destination: "/", permanent: false },
      { source: "/sign-in", destination: "/access", permanent: false },
    ];
  },
};

export default nextConfig;

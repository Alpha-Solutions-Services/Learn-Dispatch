/** @type {import('next').NextConfig} */
const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js App Router needs inline/eval for some runtime chunks in production builds
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Tailwind + Framer Motion use inline styles
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.sanity.io https://*.supabase.co",
  "font-src 'self' data:",
  // Supabase Auth/Realtime/Storage + Sanity asset CDN (browser). Groq is server-only.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.sanity.io",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
    ];
  },
};

export default nextConfig;

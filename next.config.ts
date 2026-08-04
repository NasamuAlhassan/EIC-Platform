import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Lint is run separately in CI; don't block production builds on style rules.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  async redirects() {
    return [
      /*
       * A bookmarkable "admin login" address.
       *
       * There is deliberately only one set of credentials: a role is only
       * knowable *after* someone authenticates, so a second sign-in page
       * couldn't actually keep administrators and members apart — it would just
       * be a second door to the same lock, with people queueing at the wrong
       * one. What an executive actually wants is a link that lands them in the
       * admin area rather than the member dashboard, which is what this is.
       *
       * Role is still enforced at /admin, so this grants nothing by itself.
       */
      {
        source: "/admin/login",
        destination: "/login?callbackUrl=/admin",
        permanent: false,
      },
    ];
  },

  experimental: {
    serverActions: {
      // Publications and event photo sets can be large.
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Every dashboard view reads the signed-in session, so only segments that export `instant` are validated.
    instantInsights: { validationLevel: "manual-warning" },
  },
  async redirects() {
    // Links and bookmarks from before the dashboard spoke of clients and staff.
    return [
      { source: "/clients/companies/:path*", destination: "/clients", permanent: false },
      { source: "/crm/companies/:path*", destination: "/clients", permanent: false },
      { source: "/crm/contacts/:id", destination: "/clients/:id", permanent: true },
      { source: "/crm/:path*", destination: "/clients/:path*", permanent: true },
      { source: "/team/:path*", destination: "/staff/:path*", permanent: true },
      { source: "/settings/contact-authentication", destination: "/settings/client-authentication", permanent: true },
      { source: "/settings/contact-notifications", destination: "/settings/client-notifications", permanent: true },
      { source: "/api/v1/contacts", destination: "/api/v1/clients", permanent: false },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

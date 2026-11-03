import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  serverExternalPackages: [
    'better-sqlite3',
    '@prisma/adapter-better-sqlite3',
    'bcryptjs',
  ],
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '192.168.1.11',
    '192.168.1.*',
  ],
};

export default nextConfig;

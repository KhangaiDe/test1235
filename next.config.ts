import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static export: `npm run build` writes plain HTML/JS/CSS to ./out,
  // which uploads straight to Cloudflare (Workers & Pages → Upload assets).
  output: 'export',
  trailingSlash: true,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;

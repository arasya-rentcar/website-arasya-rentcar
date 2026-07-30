import type { NextConfig } from 'next';

const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Fleet/gallery photos uploaded through Content Studio live in Supabase Storage.
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
      : [],
    formats: ['image/webp'],
  },
  eslint: {
    dirs: ['app', 'src', 'scripts'],
  },
};

export default nextConfig;

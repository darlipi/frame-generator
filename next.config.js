/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true, // frames/photos are handled entirely client-side
  },
};

module.exports = nextConfig;

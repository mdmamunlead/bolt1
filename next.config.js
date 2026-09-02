/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push({
      'archiver': 'commonjs archiver',
    });
    return config;
  },
};

module.exports = nextConfig;

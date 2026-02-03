const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Фиксит проблему с monorepo
  outputFileTracingRoot: path.join(__dirname, './'),
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    return config;
  },
}

module.exports = nextConfig

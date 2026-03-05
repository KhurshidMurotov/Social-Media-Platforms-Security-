/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    // Prevent incorrect workspace-root inference on Windows when multiple lockfiles exist.
    root: __dirname
  }
};

module.exports = nextConfig;


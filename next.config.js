/**
 * next.config.js
 * Configure Next.js to allow static export (next export)
 */
const nextConfig = {
  reactStrictMode: true,
  // Make sure next export works
  output: 'export',
  // replace 'repo' with your repository name
  basePath: '/dronegym',
  assetPrefix: '/dronegym/',
}

module.exports = nextConfig;

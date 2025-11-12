/**
 * next.config.js
 * Configure Next.js to allow static export (next export)
 */
// Use an environment variable to set basePath for deployments (e.g. GitHub Pages).
// During local development leave basePath unset so the site is available at '/'.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
const assetPrefix = basePath ? `${basePath}/` : ''

// allowedDevOrigins: in dev Next.js will warn if a different origin (for
// example your LAN IP) requests /_next assets (HMR, runtime). Provide a
// comma-separated list via NEXT_ALLOWED_DEV_ORIGINS or fall back to common
// loopback and the current LAN IP seen while developing.
const allowedDevOriginsEnv = process.env.NEXT_ALLOWED_DEV_ORIGINS || ''
const defaultAllowed = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  // add the local network address you saw in the logs; keep this file generic
  'http://192.168.86.32:3000'
]
const allowedDevOrigins = allowedDevOriginsEnv
  ? allowedDevOriginsEnv.split(',').map(s => s.trim()).filter(Boolean)
  : defaultAllowed

const nextConfig = {
  reactStrictMode: true,
  // Make sure next export works
  output: 'export',
  basePath: basePath || undefined,
  assetPrefix: assetPrefix || undefined,
  // Development-only setting to silence cross-origin dev warnings for HMR/
  // _next resources when using a LAN IP or custom host.
  allowedDevOrigins,
}

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  // Pages serves this repo at /HotHandAnalytics.io/. /LineSnipe 404s CSS and JS, so the app never hydrates.
  basePath: process.env.NODE_ENV === 'production' ? '/HotHandAnalytics.io' : '',
  trailingSlash: true,
}

module.exports = nextConfig

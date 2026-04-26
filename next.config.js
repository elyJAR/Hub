/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable if needed for custom server
    serverComponentsExternalPackages: ['ws']
  },
  // Disable static optimization since we're using a custom server
  output: 'standalone'
}

module.exports = nextConfig
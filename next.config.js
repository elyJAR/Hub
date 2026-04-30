/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable if needed for custom server
    serverComponentsExternalPackages: ['ws']
  },
  // Disable static optimization since we're using a custom server
  output: 'standalone',
  // Configure webpack for custom server HMR
  webpack: (config, { dev, isServer }) => {
    // In development with custom server, configure HMR to use polling
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300,
      }
    }
    return config
  },
}

module.exports = nextConfig
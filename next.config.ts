import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: config => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    // Alias React Native AsyncStorage to a web shim to satisfy wallet deps
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@react-native-async-storage/async-storage': require('path').resolve(process.cwd(), 'utils/asyncStorageShim.ts')
    }
    return config
  }
};

export default nextConfig;
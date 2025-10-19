// next.config.ts
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // ✅ Disable console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // ✅ Ignore TypeScript build errors
  typescript: {
    ignoreBuildErrors: true,
  },

  // ✅ Ignore ESLint build errors
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ Custom webpack config
  webpack: (config) => {
    // Prevent bundling optional deps
    config.externals.push("pino-pretty", "lokijs", "encoding");

    // Add alias for async storage shim
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@react-native-async-storage/async-storage": path.resolve(
        process.cwd(),
        "utils/asyncStorageShim.ts"
      ),
    };

    // ✅ Prevent build from failing on optional module resolution
    config.ignoreWarnings = [
      { message: /Critical dependency:/ },
      { message: /Can't resolve 'pino-pretty'/ },
      { message: /Can't resolve 'lokijs'/ },
    ];

    return config;
  },
};

export default nextConfig;
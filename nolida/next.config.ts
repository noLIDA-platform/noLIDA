import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["pg", "bcryptjs"],
  images: {
    // 75 is the Next.js default; 92 is what FannedStack renders the auth fan at,
    // and Next warns at runtime for any quality outside this list.
    qualities: [75, 92],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

// 앱(Capacitor)용 빌드(CAPACITOR_BUILD=true)일 때만 정적 export.
// 평소 웹(Vercel) 빌드는 기존 설정과 동일하다.
const isAppBuild = process.env.CAPACITOR_BUILD === "true";

const nextConfig: NextConfig = isAppBuild
  ? {
      output: "export",
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {};

export default nextConfig;

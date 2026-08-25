/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // NEO UI(styled-components) SSR — 서버/클라이언트 클래스명 일치
  compiler: { styledComponents: true },
};

export default nextConfig;

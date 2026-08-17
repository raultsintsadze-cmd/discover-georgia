import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Populated in later phases once the storage/video CDN provider is finalized.
    ],
  },
};

export default withNextIntl(nextConfig);

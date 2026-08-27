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
  experimental: {
    // Next 15 defaults dynamic routes to a 0s client Router Cache — every
    // navigation back to an already-visited page re-runs its server
    // component (and its Prisma/service calls) from scratch. Every page in
    // this app that isn't behind auth-gated mutations reads data that's
    // fine to reuse for a few seconds (feed, trip summary shell, category
    // list); anything that actually changes as a result of a user action
    // (AI trip edits, place add/remove, driver select, requesting a trip)
    // already calls router.refresh() or navigates via a fresh POST/PATCH
    // response, which busts this cache immediately — so this only removes
    // the redundant refetch on a plain back-and-forth tab switch, not
    // after a real edit.
    staleTimes: { dynamic: 30 },
  },
};

export default withNextIntl(nextConfig);

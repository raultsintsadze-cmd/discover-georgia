import { getFeedPage } from "@/lib/feed";
import { VideoFeed } from "@/components/feed/VideoFeed";

const PAGE_SIZE = 6;

export default async function DiscoverPage() {
  const { items, hasMore } = await getFeedPage(1, PAGE_SIZE);

  return <VideoFeed initialItems={items} initialHasMore={hasMore} />;
}

"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { FeedCard } from "./FeedCard";
import type { FeedItem } from "@/lib/feed";

const PAGE_SIZE = 6;
const ACTIVE_THRESHOLD = 0.6;

export interface VideoFeedProps {
  initialItems: FeedItem[];
  initialHasMore: boolean;
}

export function VideoFeed({ initialItems, initialHasMore }: VideoFeedProps) {
  const { status } = useSession();
  const [items, setItems] = React.useState(initialItems);
  const [hasMore, setHasMore] = React.useState(initialHasMore);
  const [page, setPage] = React.useState(1);
  const loadingMoreRef = React.useRef(false);
  const [activeId, setActiveId] = React.useState<string | null>(initialItems[0]?.id ?? null);
  const viewedIds = React.useRef<Set<string>>(new Set());
  const [savedPlaceIds, setSavedPlaceIds] = React.useState<Set<string>>(new Set());
  const [savedActivityIds, setSavedActivityIds] = React.useState<Set<string>>(new Set());
  // Shared across every card, not per-card local state — once true, it
  // stays true for the rest of the session, including cards that haven't
  // loaded yet. Browsers block unmuted autoplay only until the user has
  // interacted with the page at all (doesn't need to be the same click
  // that triggers a given video's play() call — see the container's
  // onClick below); after that, muted playback is a UX choice, not a
  // browser restriction, so there's no reason to keep resetting it.
  const [muted, setMuted] = React.useState(true);

  // Fetched once per session so each card knows its initial saved state
  // without every card firing its own request. Two separate saved-item
  // types (SavedPlace/SavedActivity, see docs/architecture.md — this
  // codebase doesn't use polymorphic associations), so two lookups.
  React.useEffect(() => {
    if (status !== "authenticated") {
      setSavedPlaceIds(new Set());
      setSavedActivityIds(new Set());
      return;
    }
    Promise.all([fetch("/api/saved").then((res) => res.json()), fetch("/api/saved-activities").then((res) => res.json())])
      .then(([placesBody, activitiesBody]) => {
        setSavedPlaceIds(new Set((placesBody.data ?? []).map((s: { placeId: string }) => s.placeId)));
        setSavedActivityIds(new Set((activitiesBody.data ?? []).map((s: { activityId: string }) => s.activityId)));
      })
      .catch(() => {});
  }, [status]);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  const loadMore = React.useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/feed?page=${nextPage}&pageSize=${PAGE_SIZE}`);
      const body = await res.json();
      if (res.ok) {
        setItems((prev) => [...prev, ...body.data.items]);
        setHasMore(body.data.hasMore);
        setPage(nextPage);
      }
    } finally {
      loadingMoreRef.current = false;
    }
  }, [hasMore, page]);

  // Active-card tracking: autoplay the mostly-visible card, pause the rest.
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= ACTIVE_THRESHOLD) {
            const id = (entry.target as HTMLElement).dataset.feedId;
            if (!id) continue;
            setActiveId(id);
            if (!viewedIds.current.has(id)) {
              viewedIds.current.add(id);
              const item = items.find((i) => i.id === id);
              if (item?.video) {
                fetch(`/api/videos/${item.video.id}/view`, { method: "POST" }).catch(() => {});
              }
            }
          }
        }
      },
      { root: container, threshold: [0, ACTIVE_THRESHOLD, 1] }
    );

    for (const el of cardRefs.current.values()) observer.observe(el);
    return () => observer.disconnect();
  }, [items]);

  // Infinite scroll: start loading the next page well before the user hits the end.
  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = containerRef.current;
    if (!sentinel || !container || !hasMore) return;

    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), {
      root: container,
      rootMargin: "200% 0px",
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div
      ref={containerRef}
      onClick={() => setMuted(false)}
      className="no-scrollbar h-[calc(100dvh-4.5rem)] w-full snap-y snap-mandatory overflow-y-scroll"
    >
      {items.map((item) => (
        <FeedCard
          key={item.id}
          item={item}
          active={item.id === activeId}
          initialSaved={item.kind === "place" ? savedPlaceIds.has(item.placeId) : savedActivityIds.has(item.activityId)}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
          scrollContainerRef={containerRef}
          ref={(el) => {
            if (el) cardRefs.current.set(item.id, el);
            else cardRefs.current.delete(item.id);
          }}
        />
      ))}
      {hasMore && <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />}
    </div>
  );
}

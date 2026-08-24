"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { motion, useScroll, useTransform } from "framer-motion";
import { Bookmark, MapPinPlus, MessageCircleQuestion, Navigation, Share2, Volume2, VolumeX, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useSavedPlace } from "@/lib/hooks/useSavedPlace";
import { useSavedActivity } from "@/lib/hooks/useSavedActivity";
import { AddToTripSheet } from "@/components/trip/AddToTripSheet";
import { InquireSheet } from "@/components/place/InquireSheet";
import { SaveGlyph } from "@/components/motion/SaveGlyph";
import { gradientForId } from "@/lib/utils/gradient";
import { moodFor, paletteFor } from "@/lib/utils/mood";
import { cn } from "@/lib/utils/cn";
import type { FeedItem } from "@/lib/feed";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export interface FeedCardProps {
  item: FeedItem;
  /** Whether this card is the one currently in view — drives play/pause. */
  active: boolean;
  initialSaved: boolean;
  /** The VideoFeed's scroll container, used to derive per-card scroll progress for the parallax zoom. */
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

function RailButton({
  icon: Icon,
  label,
  onClick,
  active,
  glyph = false,
}: {
  icon: typeof Bookmark;
  label: string;
  onClick: () => void;
  active?: boolean;
  glyph?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.82 }}
      transition={{ duration: 0.18, ease: EASE_OUT }}
      className="flex flex-col items-center gap-1 text-white"
    >
      <span
        className={cn(
          "flex h-touch w-touch items-center justify-center rounded-full bg-black/30 backdrop-blur-sm transition-colors duration-base",
          active && "bg-accent-500"
        )}
      >
        {glyph ? <SaveGlyph icon={Icon} active={!!active} /> : <Icon className="h-5 w-5" aria-hidden="true" fill={active ? "currentColor" : "none"} />}
      </span>
      <span className="text-caption drop-shadow-sm">{label}</span>
    </motion.button>
  );
}

export const FeedCard = React.forwardRef<HTMLDivElement, FeedCardProps>(function FeedCard(
  { item, active, initialSaved, scrollContainerRef },
  ref
) {
  const { status } = useSession();
  const { toast } = useToast();
  const t = useTranslations("discover");
  const tActivity = useTranslations("activity");
  // Both hooks always called (rules-of-hooks) — only one's state is used,
  // picked by item.kind below. Each is a cheap no-op fetch/toggle target
  // for the kind it doesn't apply to since it's never invoked.
  const placeSaved = useSavedPlace(item.kind === "place" ? item.id : "", item.kind === "place" && initialSaved);
  const activitySaved = useSavedActivity(item.kind === "activity" ? item.id : "", item.kind === "activity" && initialSaved);
  const { saved, toggle } = item.kind === "place" ? placeSaved : activitySaved;
  const [addToTripOpen, setAddToTripOpen] = React.useState(false);
  const [inquireOpen, setInquireOpen] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = React.useState(true);
  const localRef = React.useRef<HTMLDivElement>(null);

  const setRefs = React.useCallback(
    (el: HTMLDivElement | null) => {
      localRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
    },
    [ref]
  );

  const { scrollYProgress } = useScroll({
    target: localRef,
    container: scrollContainerRef,
    offset: ["start end", "end start"],
  });
  // Subtle zoom "breathe": slightly zoomed out while entering/leaving,
  // sharp and settled while centered in view — the parallax cue the spec
  // asked for on the active card, done via scale (not translate) so it
  // never reveals gaps at the object-cover edges.
  const mediaScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.16, 1.02, 1.16]);

  const mood = item.kind === "place" ? moodFor(item.categoryName, item.regionName) : moodFor(item.category, item.nearPlaceName);
  const palette = paletteFor(mood);
  const categoryLabel = item.kind === "activity" ? tActivity(`categories.${item.category}` as `categories.${string}`) : null;
  const detailHref = item.kind === "place" ? `/places/${item.slug}` : `/activities/${item.slug}`;

  React.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (active) {
      el.play().catch(() => {
        // Autoplay can be blocked before any user gesture — muted default avoids this in practice.
      });
    } else {
      el.pause();
    }
  }, [active]);

  function requireSignIn(description: string) {
    toast({ title: t("toast.signInRequiredTitle"), description });
  }

  function handleToggleSave() {
    if (status !== "authenticated") {
      requireSignIn(t("toast.signInToSave"));
      return;
    }
    toggle();
  }

  function handleAddToTrip() {
    if (status !== "authenticated") {
      requireSignIn(t("toast.signInToAddToTrip"));
      return;
    }
    setAddToTripOpen(true);
  }

  function handleInquire() {
    if (status !== "authenticated") {
      requireSignIn(t("toast.signInToInquire"));
      return;
    }
    setInquireOpen(true);
  }

  async function handleShare() {
    const url = `${window.location.origin}${detailHref}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: item.name, url });
      } catch {
        // user dismissed the native share sheet
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    toast({ title: t("toast.linkCopied"), variant: "success" });
  }

  function handleNavigate() {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div ref={setRefs} data-feed-id={item.id} className="relative h-full w-full shrink-0 snap-start overflow-hidden bg-chrome-bg">
      <motion.div className="absolute inset-0" style={{ scale: mediaScale }}>
        {item.video ? (
          <video
            ref={videoRef}
            src={item.video.url}
            poster={item.video.posterUrl ?? undefined}
            muted={muted}
            loop
            playsInline
            preload={active ? "auto" : "none"}
            onEnded={() => {
              fetch(`/api/videos/${item.video!.id}/complete`, { method: "POST" }).catch(() => {});
            }}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className={cn("h-full w-full", gradientForId(item.id))} aria-hidden="true" />
        )}
      </motion.div>

      {/* Mood-tinted scrim — shifts per region/category (icy blue mountains, warm gold wine country, deep teal coast) instead of one flat overlay everywhere. */}
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-t", palette.overlay)} aria-hidden="true" />

      {item.video && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? t("video.unmute") : t("video.mute")}
          className="absolute right-4 z-10 flex h-touch w-touch items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm"
          style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}
        >
          {muted ? <VolumeX className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
        </motion.button>
      )}

      <div className="absolute bottom-28 right-3 z-10 flex flex-col items-center gap-5">
        <RailButton icon={Bookmark} label={saved ? t("rail.saved") : t("rail.save")} active={saved} onClick={handleToggleSave} glyph />
        {item.kind === "place" ? (
          <RailButton icon={MapPinPlus} label={t("rail.trip")} onClick={handleAddToTrip} />
        ) : (
          <RailButton icon={MessageCircleQuestion} label={t("rail.inquire")} onClick={handleInquire} />
        )}
        <RailButton icon={Navigation} label={t("rail.go")} onClick={handleNavigate} />
        <RailButton icon={Share2} label={t("rail.share")} onClick={handleShare} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={active ? { opacity: 1, y: 0 } : { opacity: 0.55, y: 10 }}
        transition={{ duration: 0.55, ease: EASE_OUT }}
        className="absolute inset-x-0 bottom-0 z-10 px-5 pb-8 pr-24"
      >
        <Link href={detailHref}>
          {item.kind === "place" ? (
            <>
              <p className="text-caption font-medium uppercase tracking-wide" style={{ color: palette.accent }}>
                {item.regionName} · {item.categoryName}
              </p>
              <p className="font-display text-h2 text-white">{item.name}</p>
              <p className="mt-1 line-clamp-2 text-body-sm text-white/90">{item.shortDescription}</p>
            </>
          ) : (
            <>
              <p className="text-caption font-medium uppercase tracking-wide" style={{ color: palette.accent }}>
                {categoryLabel}
                {item.nearPlaceName ? ` · ${item.nearPlaceName}` : ""}
              </p>
              <p className="font-display text-h2 text-white">{item.name}</p>
              {item.description && <p className="mt-1 line-clamp-2 text-body-sm text-white/90">{item.description}</p>}
            </>
          )}
          <span className="mt-2 inline-flex items-center gap-1 text-body-sm font-medium text-white">
            {item.kind === "place" ? t("viewPlace") : t("viewActivity")} <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </Link>
      </motion.div>

      {item.kind === "place" ? (
        <AddToTripSheet open={addToTripOpen} onOpenChange={setAddToTripOpen} placeId={item.id} placeName={item.name} />
      ) : (
        <InquireSheet open={inquireOpen} onOpenChange={setInquireOpen} activitySlug={item.slug} />
      )}
    </div>
  );
});

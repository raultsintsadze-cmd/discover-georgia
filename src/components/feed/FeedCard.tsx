"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Bookmark, MapPinPlus, Navigation, Share2, Volume2, VolumeX, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useSavedPlace } from "@/lib/hooks/useSavedPlace";
import { AddToTripSheet } from "@/components/trip/AddToTripSheet";
import { gradientForId } from "@/lib/utils/gradient";
import { cn } from "@/lib/utils/cn";
import type { FeedItem } from "@/lib/feed";

export interface FeedCardProps {
  item: FeedItem;
  /** Whether this card is the one currently in view — drives play/pause. */
  active: boolean;
  initialSaved: boolean;
}

function RailButton({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: typeof Bookmark;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1 text-white">
      <span
        className={cn(
          "flex h-touch w-touch items-center justify-center rounded-full bg-black/30 backdrop-blur-sm",
          active && "bg-accent-500"
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" fill={active ? "currentColor" : "none"} />
      </span>
      <span className="text-caption drop-shadow-sm">{label}</span>
    </button>
  );
}

export const FeedCard = React.forwardRef<HTMLDivElement, FeedCardProps>(function FeedCard(
  { item, active, initialSaved },
  ref
) {
  const { status } = useSession();
  const { toast } = useToast();
  const t = useTranslations("discover");
  const { saved, toggle } = useSavedPlace(item.id, initialSaved);
  const [addToTripOpen, setAddToTripOpen] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = React.useState(true);

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

  async function handleShare() {
    const url = `${window.location.origin}/places/${item.slug}`;
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
    <div ref={ref} data-feed-id={item.id} className="relative h-full w-full shrink-0 snap-start overflow-hidden bg-chrome-bg">
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
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className={cn("absolute inset-0", gradientForId(item.id))} aria-hidden="true" />
      )}

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30"
        aria-hidden="true"
      />

      {item.video && (
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? t("video.unmute") : t("video.mute")}
          className="absolute right-4 z-10 flex h-touch w-touch items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm"
          style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}
        >
          {muted ? <VolumeX className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
        </button>
      )}

      <div className="absolute bottom-28 right-3 z-10 flex flex-col items-center gap-5">
        <RailButton icon={Bookmark} label={saved ? t("rail.saved") : t("rail.save")} active={saved} onClick={handleToggleSave} />
        <RailButton icon={MapPinPlus} label={t("rail.trip")} onClick={handleAddToTrip} />
        <RailButton icon={Navigation} label={t("rail.go")} onClick={handleNavigate} />
        <RailButton icon={Share2} label={t("rail.share")} onClick={handleShare} />
      </div>

      <Link href={`/places/${item.slug}`} className="absolute inset-x-0 bottom-0 z-10 px-5 pb-8 pr-24">
        <p className="text-caption font-medium uppercase tracking-wide text-white/80">
          {item.regionName} · {item.categoryName}
        </p>
        <p className="font-display text-h2 text-white">{item.name}</p>
        <p className="mt-1 line-clamp-2 text-body-sm text-white/90">{item.shortDescription}</p>
        <span className="mt-2 inline-flex items-center gap-1 text-body-sm font-medium text-white">
          {t("viewPlace")} <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </Link>

      <AddToTripSheet open={addToTripOpen} onOpenChange={setAddToTripOpen} placeId={item.id} placeName={item.name} />
    </div>
  );
});

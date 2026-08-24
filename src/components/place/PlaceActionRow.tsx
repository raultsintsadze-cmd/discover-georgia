"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Bookmark, MapPinPlus, Navigation, Share2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useSavedPlace } from "@/lib/hooks/useSavedPlace";
import { AddToTripSheet } from "@/components/trip/AddToTripSheet";
import { SaveGlyph } from "@/components/motion/SaveGlyph";
import { cn } from "@/lib/utils/cn";

export interface PlaceActionRowProps {
  placeId: string;
  placeName: string;
  latitude: number;
  longitude: number;
  initialSaved: boolean;
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
  glyph = false,
}: {
  icon: typeof Bookmark;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  glyph?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.88 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1.5 rounded-md py-3 text-ink-700",
        "transition-colors duration-fast hover:bg-surface-2 disabled:opacity-50",
        active && "text-accent-600"
      )}
    >
      <span
        className={cn(
          "flex h-touch w-touch items-center justify-center rounded-full border border-border transition-colors duration-base",
          active && "border-accent-500 bg-accent-tint"
        )}
      >
        {glyph ? <SaveGlyph icon={Icon} active={!!active} /> : <Icon className="h-5 w-5" aria-hidden="true" fill={active ? "currentColor" : "none"} />}
      </span>
      <span className="text-caption font-medium">{label}</span>
    </motion.button>
  );
}

export function PlaceActionRow({ placeId, placeName, latitude, longitude, initialSaved }: PlaceActionRowProps) {
  const { status } = useSession();
  const { toast } = useToast();
  const t = useTranslations("place");
  const { saved, pending, toggle } = useSavedPlace(placeId, initialSaved);
  const [addToTripOpen, setAddToTripOpen] = React.useState(false);

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
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title: placeName, url });
      } catch {
        // user cancelled the native share sheet — not an error
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    toast({ title: t("toast.linkCopied"), variant: "success" });
  }

  function handleNavigate() {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <div className="flex items-stretch gap-1 border-b border-border px-2 py-1">
        <ActionButton
          icon={Bookmark}
          label={saved ? t("actionRow.saved") : t("actionRow.save")}
          active={saved}
          disabled={pending}
          onClick={handleToggleSave}
          glyph
        />
        <ActionButton icon={MapPinPlus} label={t("actionRow.addToTrip")} onClick={handleAddToTrip} />
        <ActionButton icon={Navigation} label={t("actionRow.navigate")} onClick={handleNavigate} />
        <ActionButton icon={Share2} label={t("actionRow.share")} onClick={handleShare} />
      </div>

      <AddToTripSheet open={addToTripOpen} onOpenChange={setAddToTripOpen} placeId={placeId} placeName={placeName} />
    </>
  );
}

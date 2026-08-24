"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Bookmark, MessageCircleQuestion, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useSavedActivity } from "@/lib/hooks/useSavedActivity";
import { SaveGlyph } from "@/components/motion/SaveGlyph";
import { InquireSheet } from "@/components/place/InquireSheet";
import { cn } from "@/lib/utils/cn";

export interface ActivityActionRowProps {
  activityId: string;
  activitySlug: string;
  initialSaved: boolean;
  /** External booking link, when the activity has an affiliate/partner one — shown alongside Inquire, not instead of it. */
  bookingUrl: string | null;
}

function ActionButton({
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
      whileTap={{ scale: 0.88 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1.5 rounded-md py-3 text-ink-700",
        "transition-colors duration-fast hover:bg-surface-2",
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

export function ActivityActionRow({ activityId, activitySlug, initialSaved, bookingUrl }: ActivityActionRowProps) {
  const { status } = useSession();
  const { toast } = useToast();
  const t = useTranslations("activity");
  const { saved, toggle } = useSavedActivity(activityId, initialSaved);
  const [inquireOpen, setInquireOpen] = React.useState(false);

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

  function handleInquire() {
    if (status !== "authenticated") {
      requireSignIn(t("toast.signInToInquire"));
      return;
    }
    setInquireOpen(true);
  }

  return (
    <>
      <div className="flex items-stretch gap-1 border-b border-border px-2 py-1">
        <ActionButton icon={Bookmark} label={saved ? t("actionRow.saved") : t("actionRow.save")} active={saved} onClick={handleToggleSave} glyph />
        <ActionButton icon={MessageCircleQuestion} label={t("actionRow.inquire")} onClick={handleInquire} />
        {bookingUrl && (
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-md py-3 text-ink-700 transition-colors duration-fast hover:bg-surface-2"
          >
            <span className="flex h-touch w-touch items-center justify-center rounded-full border border-border">
              <ExternalLink className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-caption font-medium">{t("actionRow.bookDirectly")}</span>
          </a>
        )}
      </div>

      <InquireSheet open={inquireOpen} onOpenChange={setInquireOpen} activitySlug={activitySlug} />
    </>
  );
}

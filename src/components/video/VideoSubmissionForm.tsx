"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileVideo, TriangleAlert } from "lucide-react";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { PlacePicker } from "@/components/place/PlacePicker";
import { ActivityPicker } from "@/components/place/ActivityPicker";
import { detectMp4VideoCodec, type DetectedVideoCodec } from "@/lib/utils/videoCodec";
import type { PlaceSummary } from "@/lib/services/place.service";

const MAX_FILE_BYTES = 200 * 1024 * 1024;
const ACCEPTED_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

function uploadWithProgress(url: string, file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status))));
    xhr.onerror = () => reject(new Error("network error"));
    xhr.send(file);
  });
}

export function VideoSubmissionForm() {
  const t = useTranslations("submit");
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [place, setPlace] = React.useState<PlaceSummary | null>(null);
  const [activityId, setActivityId] = React.useState<string | null>(null);
  const [videoUrl, setVideoUrl] = React.useState("");
  const [detectedCodec, setDetectedCodec] = React.useState<DetectedVideoCodec | null>(null);
  const [fileName, setFileName] = React.useState("");
  const [uploadPercent, setUploadPercent] = React.useState<number | null>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [description, setDescription] = React.useState("");
  const [creatorName, setCreatorName] = React.useState("");
  const [instagram, setInstagram] = React.useState("");
  const [tiktok, setTiktok] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState(session?.user?.email ?? "");
  const [confirmed, setConfirmed] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (session?.user?.email) setContactEmail(session.user.email);
  }, [session?.user?.email]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setVideoUrl("");
    setDetectedCodec(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError(t("invalidFileType"));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setUploadError(t("fileTooLarge"));
      return;
    }

    // Runs alongside the upload, not before it — it's a pure client-side
    // parse (see lib/utils/videoCodec.ts), no reason to delay the actual
    // upload start waiting on it. Informational only: never blocks
    // submission, since playback gets fixed transparently either way.
    detectMp4VideoCodec(file).then(setDetectedCodec);

    setFileName(file.name);
    setUploadPercent(0);
    try {
      const res = await fetch("/api/storage/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? "upload-url failed");

      await uploadWithProgress(body.data.uploadUrl, file, setUploadPercent);
      setVideoUrl(body.data.publicUrl);
    } catch {
      setUploadError(t("uploadError"));
      setFileName("");
    } finally {
      setUploadPercent(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!place) {
      setError(t("choosePlaceError"));
      return;
    }
    if (!videoUrl) {
      setError(t("noVideoError"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/videos/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          existingPlaceId: place.id,
          existingActivityId: activityId ?? undefined,
          videoUrl,
          detectedCodec: detectedCodec ?? undefined,
          description: description || undefined,
          creatorName,
          instagram: instagram || undefined,
          tiktok: tiktok || undefined,
          contactEmail,
          ownershipConfirmed: confirmed,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? t("submitError"));
        return;
      }
      toast({ title: t("successToastTitle"), description: t("successToastDescription"), variant: "success" });
      router.push(`/places/${place.slug}`);
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label={t("placeField")} required helperText={t("placeHelper")}>
        {() => (
          <PlacePicker
            value={place}
            onChange={(next) => {
              setPlace(next);
              setActivityId(null);
            }}
          />
        )}
      </Field>

      <ActivityPicker placeId={place?.id ?? null} value={activityId} onChange={setActivityId} />

      <Field label={t("videoField")} required helperText={uploadError ?? t("videoHelper")} errorText={uploadError ?? undefined}>
        {(fieldProps) => (
          <div>
            <input
              ref={fileInputRef}
              id={fieldProps.id}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              onChange={handleFileChange}
              className="hidden"
              aria-describedby={fieldProps["aria-describedby"]}
            />
            {!fileName ? (
              <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                <UploadCloud className="h-4 w-4" aria-hidden="true" />
                {t("chooseFileButton")}
              </Button>
            ) : (
              <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                <FileVideo className="h-4 w-4 shrink-0 text-ink-500" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-body-sm text-ink-900">{fileName}</span>
                {uploadPercent !== null ? (
                  <span className="shrink-0 text-body-sm text-ink-500">{t("uploading", { percent: uploadPercent })}</span>
                ) : (
                  <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                    {t("changeFileButton")}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Field>

      {detectedCodec === "hevc" && (
        <div className="flex items-start gap-2.5 rounded-md border border-warning-500/30 bg-warning-tint px-3.5 py-3 text-body-sm text-ink-700">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning-500" aria-hidden="true" />
          <span>{t("hevcWarning")}</span>
        </div>
      )}

      <Field label={t("descriptionField")}>
        {(fieldProps) => (
          <Textarea {...fieldProps} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        )}
      </Field>

      <Field label={t("creatorNameField")} required>
        {(fieldProps) => (
          <Input {...fieldProps} value={creatorName} onChange={(e) => setCreatorName(e.target.value)} required />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("instagramField")}>
          {(fieldProps) => (
            <Input {...fieldProps} value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder={t("handlePlaceholder")} />
          )}
        </Field>
        <Field label={t("tiktokField")}>
          {(fieldProps) => (
            <Input {...fieldProps} value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder={t("handlePlaceholder")} />
          )}
        </Field>
      </div>

      <Field label={t("contactEmailField")} required>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
          />
        )}
      </Field>

      <label className="flex items-start gap-2.5 text-body-sm text-ink-700">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
          required
        />
        {t("ownershipConfirm")}
      </label>

      {error && (
        <p className="text-body-sm text-danger-500" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" loading={loading} disabled={!confirmed || !videoUrl || uploadPercent !== null}>
        {t("submitButton")}
      </Button>
    </form>
  );
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { videoService } from "@/lib/services/impl/VideoService";
import { jsonOk, jsonError, zodIssuesToFields } from "@/lib/api/response";

const bodySchema = z.object({
  existingPlaceId: z.string().min(1),
  videoUrl: z.string().trim().url(),
  description: z.string().trim().max(500).optional(),
  creatorName: z.string().trim().min(1).max(100),
  instagram: z.string().trim().max(100).optional(),
  tiktok: z.string().trim().max(100).optional(),
  contactEmail: z.string().trim().email(),
  // Enforces the spec §15 ownership confirmation checkbox server-side, not
  // just in the UI — a client that skips the checkbox can't submit.
  ownershipConfirmed: z.literal(true),
});

export async function POST(request: NextRequest) {
  const t = await getTranslations("apiErrors");
  const session = await auth();
  if (!session?.user) {
    return jsonError("UNAUTHENTICATED", t("signInToSubmitVideo"), 401);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidSubmission"), 400, zodIssuesToFields(parsed.error.issues));
  }

  const place = await prisma.place.findUnique({
    where: { id: parsed.data.existingPlaceId },
    select: { id: true, name: true },
  });
  if (!place) {
    return jsonError("NOT_FOUND", t("selectedPlaceNotFound"), 404);
  }

  const { submissionId } = await videoService.submitVideo({
    submittedByUserId: session.user.id,
    placeName: place.name,
    existingPlaceId: place.id,
    videoUrl: parsed.data.videoUrl,
    description: parsed.data.description,
    creatorName: parsed.data.creatorName,
    instagram: parsed.data.instagram,
    tiktok: parsed.data.tiktok,
    contactEmail: parsed.data.contactEmail,
    ownershipConfirmed: parsed.data.ownershipConfirmed,
  });

  return jsonOk({ submissionId }, { status: 201 });
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { placeService } from "@/lib/services/impl/PlaceService";
import { jsonCached, jsonError, zodIssuesToFields } from "@/lib/api/response";

const querySchema = z.object({
  q: z.string().trim().min(1).optional(),
  region: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  tag: z.array(z.string()).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: NextRequest) {
  const t = await getTranslations("apiErrors");
  const sp = request.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    q: sp.get("q") ?? undefined,
    region: sp.get("region") ?? undefined,
    category: sp.get("category") ?? undefined,
    tag: sp.getAll("tag").length > 0 ? sp.getAll("tag") : undefined,
    page: sp.get("page") ?? undefined,
    pageSize: sp.get("pageSize") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidQueryParameters"), 400, zodIssuesToFields(parsed.error.issues));
  }

  const { q, region, category, tag, page, pageSize } = parsed.data;
  const places = await placeService.search({
    query: q,
    regionSlug: region,
    categorySlug: category,
    tags: tag,
    page,
    pageSize,
  });

  return jsonCached(places, 60);
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { getFeedPage } from "@/lib/feed";
import { jsonOk, jsonError, zodIssuesToFields } from "@/lib/api/response";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(20).optional().default(6),
});

export async function GET(request: NextRequest) {
  const t = await getTranslations("apiErrors");
  const sp = request.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    page: sp.get("page") ?? undefined,
    pageSize: sp.get("pageSize") ?? undefined,
  });
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidQueryParameters"), 400, zodIssuesToFields(parsed.error.issues));
  }

  const page = await getFeedPage(parsed.data.page, parsed.data.pageSize);
  return jsonOk(page);
}

import { placeService } from "@/lib/services/impl/PlaceService";
import { jsonOk } from "@/lib/api/response";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const places = await placeService.listByRegion(slug);
  return jsonOk(places);
}

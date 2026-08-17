import { videoService } from "@/lib/services/impl/VideoService";
import { jsonOk } from "@/lib/api/response";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await videoService.recordCompletion(id);
  return jsonOk({ recorded: true });
}

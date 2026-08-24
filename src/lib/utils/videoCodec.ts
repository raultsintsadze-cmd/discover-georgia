/**
 * Best-effort client-side codec sniff for MP4/QuickTime (.mp4/.mov share
 * the same ISO-BMFF box structure) — walks the box tree looking for the
 * first video track's sample entry FourCC (avc1 = H.264, hev1/hvc1 =
 * HEVC/H.265, ...) without decoding or even reading most of the file:
 * `mdat` (the actual video bytes, often 99% of the file) is skipped by
 * its box size, never read. Exists because File.type only reports the
 * *container* MIME type — a HEVC-encoded iPhone .mp4 reports "video/mp4",
 * identical to an H.264 one, so there is no way to catch this without
 * actually looking inside the box structure.
 *
 * Deliberately fails open: WebM (a different, non-ISO-BMFF container that
 * never carries HEVC in practice) and any file this parser can't make
 * sense of both resolve to "unknown" rather than throwing — this is a
 * heads-up for the user, not a gate, so a parsing edge case must never
 * block a legitimate upload.
 */
export type DetectedVideoCodec = "h264" | "hevc" | "vp9" | "av1" | "other" | "unknown";

const VIDEO_CODEC_FOURCC: Record<string, DetectedVideoCodec> = {
  avc1: "h264",
  avc3: "h264",
  hev1: "hevc",
  hvc1: "hevc",
  vp09: "vp9",
  av01: "av1",
};

async function readBytes(file: File, offset: number, length: number): Promise<DataView> {
  const buf = await file.slice(offset, offset + length).arrayBuffer();
  return new DataView(buf);
}

interface Box {
  type: string;
  /** Absolute offset of this box's content (after its header). */
  contentStart: number;
  contentEnd: number;
}

/** Reads one box header at `offset` — 8 bytes normally, 16 for a 64-bit "largesize". */
async function readBoxHeader(file: File, offset: number): Promise<Box | null> {
  if (offset + 8 > file.size) return null;
  const header = await readBytes(file, offset, 16);
  let size = header.getUint32(0);
  const type = String.fromCharCode(header.getUint8(4), header.getUint8(5), header.getUint8(6), header.getUint8(7));
  let headerLen = 8;

  if (size === 1) {
    // 64-bit largesize — Number is safe here since our upload cap is 200MB, far under 2^53.
    const high = header.getUint32(8);
    const low = header.getUint32(12);
    size = high * 2 ** 32 + low;
    headerLen = 16;
  } else if (size === 0) {
    size = file.size - offset; // box extends to EOF
  }
  if (size < headerLen) return null; // malformed — bail out, caller treats as "unknown"

  return { type, contentStart: offset + headerLen, contentEnd: offset + size };
}

/** Finds the first direct child box of `types` within [start, end). Does not recurse. */
async function findChild(file: File, start: number, end: number, types: string[]): Promise<Box | null> {
  let offset = start;
  while (offset < end) {
    const box = await readBoxHeader(file, offset);
    if (!box) return null;
    if (types.includes(box.type)) return box;
    offset = box.contentEnd;
  }
  return null;
}

/** stsd is a FullBox (4 bytes version/flags) + entry_count (4 bytes), then sample entries. */
async function readStsdCodec(file: File, stsd: Box): Promise<DetectedVideoCodec> {
  if (stsd.contentEnd - stsd.contentStart < 16) return "unknown";
  const entry = await readBoxHeader(file, stsd.contentStart + 8);
  if (!entry) return "unknown";
  return VIDEO_CODEC_FOURCC[entry.type] ?? "other";
}

export async function detectMp4VideoCodec(file: File): Promise<DetectedVideoCodec> {
  // WebM/Matroska is a completely different (EBML) container — never
  // parsed here, and HEVC essentially never appears in the wild inside one.
  if (file.type === "video/webm") return "unknown";

  try {
    let offset = 0;
    let moov: Box | null = null;
    while (offset < file.size) {
      const box = await readBoxHeader(file, offset);
      if (!box) break;
      if (box.type === "moov") {
        moov = box;
        break;
      }
      offset = box.contentEnd; // skips mdat (the huge part) by size alone, no read
    }
    if (!moov) return "unknown";

    // Multiple tracks (video + audio) are common — walk each `trak`,
    // skip ones without a `vmhd` (video media header; audio tracks have
    // `smhd` instead), and read the first one that looks like video.
    let trakOffset = moov.contentStart;
    while (trakOffset < moov.contentEnd) {
      const trak = await findChild(file, trakOffset, moov.contentEnd, ["trak"]);
      if (!trak) break;

      const mdia = await findChild(file, trak.contentStart, trak.contentEnd, ["mdia"]);
      const minf = mdia ? await findChild(file, mdia.contentStart, mdia.contentEnd, ["minf"]) : null;
      const isVideoTrack = minf ? !!(await findChild(file, minf.contentStart, minf.contentEnd, ["vmhd"])) : false;

      if (isVideoTrack && minf) {
        const stbl = await findChild(file, minf.contentStart, minf.contentEnd, ["stbl"]);
        const stsd = stbl ? await findChild(file, stbl.contentStart, stbl.contentEnd, ["stsd"]) : null;
        if (stsd) return await readStsdCodec(file, stsd);
      }

      trakOffset = trak.contentEnd;
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

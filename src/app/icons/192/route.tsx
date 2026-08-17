import { ImageResponse } from "next/og";

/** PWA manifest icon — generated, not a stored asset (see manifest.ts). */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ba4e1c",
          color: "#fff",
          fontSize: 96,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        DG
      </div>
    ),
    { width: 192, height: 192 }
  );
}

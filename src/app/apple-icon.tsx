import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          fontSize: 84,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        DG
      </div>
    ),
    { ...size }
  );
}

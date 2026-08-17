import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0e0d0b",
          color: "#c4a35a",
          borderRadius: 8,
          fontSize: 18,
          fontFamily: "Georgia",
        }}
      >
        C
      </div>
    ),
    size,
  );
}

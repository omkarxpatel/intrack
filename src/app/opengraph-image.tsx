import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME} — Internship application tracker`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The card Discord, iMessage, and Twitter show when the link is shared. */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#fafafa",
          padding: 80,
          fontFamily: "monospace",
        }}
      >
        {/* Same rising bars as the favicon. */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 48 }}>
          <div style={{ width: 22, height: 40, background: "#fafafa", borderRadius: 11 }} />
          <div style={{ width: 22, height: 66, background: "#fafafa", borderRadius: 11 }} />
          <div style={{ width: 22, height: 96, background: "#fafafa", borderRadius: 11 }} />
        </div>
        <div style={{ fontSize: 68, lineHeight: 1.1, letterSpacing: -2 }}>
          Every internship application,
        </div>
        <div style={{ fontSize: 68, lineHeight: 1.1, letterSpacing: -2 }}>in one place.</div>
        <div style={{ marginTop: 36, fontSize: 30, color: "#a1a1a1" }}>
          Track statuses, dates, and notes — and see what&apos;s actually working.
        </div>
      </div>
    ),
    size,
  );
}

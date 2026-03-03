import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "VytalWatch AI - AI-Powered Remote Patient Monitoring";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Background pattern overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            opacity: 0.1,
            background:
              "radial-gradient(circle at 25% 25%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 75% 75%, #10b981 0%, transparent 50%)",
          }}
        />

        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            display: "flex",
            background: "linear-gradient(90deg, #3b82f6 0%, #10b981 100%)",
          }}
        />

        {/* Logo / Brand icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "80px",
            height: "80px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, #3b82f6, #10b981)",
            marginBottom: "32px",
          }}
        >
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>

        {/* Brand name */}
        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 800,
            color: "white",
            letterSpacing: "-0.02em",
            marginBottom: "16px",
          }}
        >
          <span>Vytal</span>
          <span style={{ color: "#3b82f6" }}>Watch</span>
          <span style={{ color: "#10b981", marginLeft: "8px" }}>AI</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#94a3b8",
            maxWidth: "700px",
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          AI-Powered Remote Patient Monitoring
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: "flex",
            gap: "48px",
            marginTop: "48px",
            padding: "24px 48px",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 32, fontWeight: 700, color: "#3b82f6" }}>
              40%
            </span>
            <span style={{ fontSize: 14, color: "#94a3b8", marginTop: "4px" }}>
              Fewer Readmissions
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 32, fontWeight: 700, color: "#10b981" }}>
              500K+
            </span>
            <span style={{ fontSize: 14, color: "#94a3b8", marginTop: "4px" }}>
              Patients Monitored
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 32, fontWeight: 700, color: "#3b82f6" }}>
              150+
            </span>
            <span style={{ fontSize: 14, color: "#94a3b8", marginTop: "4px" }}>
              Healthcare Partners
            </span>
          </div>
        </div>

        {/* Bottom URL bar */}
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            display: "flex",
            fontSize: 18,
            color: "#64748b",
          }}
        >
          vytalwatch.com
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

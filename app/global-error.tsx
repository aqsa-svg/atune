"use client";

// Last-resort boundary for errors in the root layout itself. It replaces the
// layout, so styles are inlined (the app's globals.css isn't applied here).
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#151320",
          color: "#ece9f5",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", padding: 24 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "radial-gradient(circle at 32% 30%, #F0B49A, #9A93F5)",
              boxShadow: "0 0 22px 2px rgba(154,147,245,.55)",
            }}
          />
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>Something slipped.</h1>
          <p style={{ color: "#928da6", margin: 0 }}>A hiccup on our end — your data is safe.</p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 8,
              height: 40,
              padding: "0 20px",
              borderRadius: 12,
              border: "none",
              background: "#9a93f5",
              color: "#16131f",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

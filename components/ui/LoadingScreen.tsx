import { Loader2 } from "lucide-react";

type LoadingScreenProps = {
  title?: string;
  subtitle?: string;
};

export function LoadingScreen({
  title = "Loading workspace...",
  subtitle = "Preparing your dashboard data",
}: LoadingScreenProps) {
  return (
    <main className="portal-shell" style={{ padding: "6rem 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <section
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: "480px",
          margin: "0 auto",
          padding: "2.5rem 2rem",
          display: "grid",
          gap: "1.25rem",
          justifyItems: "center",
          textAlign: "center",
          boxShadow: "var(--card-shadow)",
          border: "1px solid var(--border-color)",
          backgroundColor: "var(--surface)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: "68px",
            height: "68px",
            borderRadius: "999px",
            display: "grid",
            placeItems: "center",
            background: "radial-gradient(circle at 30% 30%, var(--brand-light), rgba(59, 130, 246, 0.05))",
            border: "1px solid var(--border-color)",
            boxShadow: "0 8px 20px rgba(0, 0, 0, 0.05)",
          }}
        >
          <Loader2 size={32} style={{ color: "var(--brand)" }} className="animate-spin" />
        </div>

        <div style={{ display: "grid", gap: "0.5rem" }}>
          <h2 style={{ margin: 0, color: "var(--ink)", fontSize: "1.2rem", fontWeight: 600, letterSpacing: "-0.01em" }}>
            {title}
          </h2>
          <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: "0.925rem", lineHeight: 1.5 }}>
            {subtitle}
          </p>
        </div>

        <div
          aria-hidden="true"
          style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center", marginTop: "0.25rem" }}
        >
          <span className="animate-pulse" style={{ width: "8px", height: "8px", borderRadius: "999px", background: "var(--brand)", animationDelay: "0ms" }} />
          <span className="animate-pulse" style={{ width: "8px", height: "8px", borderRadius: "999px", background: "var(--brand)", animationDelay: "180ms" }} />
          <span className="animate-pulse" style={{ width: "8px", height: "8px", borderRadius: "999px", background: "var(--brand)", animationDelay: "360ms" }} />
        </div>
      </section>
    </main>
  );
}

export default function HomePage() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
        textAlign: "center",
        background: "var(--bg-primary)",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: "0.875rem",
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: "var(--brand-accent-cyan)",
            fontWeight: 600,
          }}
        >
          Phase 0 · Foundation
        </span>

        <h1
          style={{
            fontSize: "3.5rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            background: "var(--brand-gradient)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          noLIDA
        </h1>

        <p
          style={{
            fontSize: "1.125rem",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
          }}
        >
          The serious global platform combining social content, commerce,
          services, bookings, messaging, and community.
        </p>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            borderRadius: "var(--radius-full)",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
            fontSize: "0.875rem",
            color: "var(--text-muted)",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "var(--color-success)",
              display: "inline-block",
            }}
          />
          System Core Initialized
        </div>
      </div>
    </main>
  );
}


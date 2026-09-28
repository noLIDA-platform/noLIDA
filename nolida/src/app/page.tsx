export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-4)",
        padding: "var(--space-5)",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(2rem, 6vw, 4rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
        }}
      >
        noLIDA
      </h1>
      <p style={{ color: "var(--color-text-muted)", maxWidth: "36rem" }}>
        Foundation ready. Health check live at{" "}
        <a href="/api/health">/api/health</a>.
      </p>
    </main>
  );
}


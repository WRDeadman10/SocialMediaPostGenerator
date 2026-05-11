import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep the app usable while still surfacing the error.
    console.error("App crashed:", error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div style={{
        minHeight: "100vh",
        background: "#0d0d12",
        color: "#eeeef5",
        padding: 20,
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
      >
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 8 }}>UI crashed while loading</div>
        <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 14 }}>
          Open DevTools Console for full stack trace.
        </div>
        <pre style={{
          whiteSpace: "pre-wrap",
          background: "rgba(255,255,255,.04)",
          border: "1px solid rgba(255,255,255,.08)",
          borderRadius: 12,
          padding: 12,
          fontSize: 12,
          lineHeight: 1.45,
        }}
        >
          {String(error?.stack || error?.message || error)}
        </pre>
      </div>
    );
  }
}


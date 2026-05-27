import { Component, type ReactNode } from "react";

interface State {
  err: Error | null;
}

/**
 * Catches unhandled render-time exceptions anywhere below it. Without this
 * the whole tree unmounts on error and the user just sees a blank page after
 * the menu flashes — which is exactly what was happening on the first
 * deploys. Rendering the error message gives us something to screenshot.
 */
export class RootErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: { componentStack: string }) {
    console.error("[root error]", err, info);
  }

  render() {
    if (!this.state.err) return this.props.children;
    const reload = () => {
      try {
        if ("caches" in window) {
          void caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
        }
        if ("serviceWorker" in navigator) {
          void navigator.serviceWorker
            .getRegistrations()
            .then((regs) => Promise.all(regs.map((r) => r.unregister())));
        }
      } finally {
        window.location.reload();
      }
    };
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          fontFamily: "system-ui, sans-serif",
          background: "#0b0b14",
          color: "#f3f3ff",
          textAlign: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>Something went wrong</h2>
        <pre
          style={{
            maxWidth: 720,
            whiteSpace: "pre-wrap",
            background: "#1a1a2e",
            padding: 16,
            borderRadius: 8,
            border: "1px solid #2a2a44",
            color: "#ffb4b4",
          }}
        >
          {this.state.err.message}
        </pre>
        <button
          type="button"
          onClick={reload}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            background: "#7c3aed",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Clear cache and reload
        </button>
      </div>
    );
  }
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { DiscordProvider } from "./discord/DiscordProvider";
import { RootErrorBoundary } from "./RootErrorBoundary";
import "./styles/global.css";

// PWA service-worker registration (Tier 6 #22). We register on next idle so
// the initial bundle parse isn't delayed. Failures are swallowed: SW is a
// progressive enhancement; the game runs fine without it.
//
// When a NEW SW activates and claims this client mid-session, the running
// JS may be referencing chunk hashes the new SW knows nothing about. Reload
// once so the page picks up the fresh module graph instead of crashing on a
// missing chunk. The `reloaded` flag prevents reload loops if the new SW
// itself triggers another controllerchange.
if ("serviceWorker" in navigator) {
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support is best-effort */
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <DiscordProvider>
        <App />
      </DiscordProvider>
    </RootErrorBoundary>
  </StrictMode>
);

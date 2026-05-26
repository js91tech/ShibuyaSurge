import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { DiscordProvider } from "./discord/DiscordProvider";
import "./styles/global.css";

// PWA service-worker registration (Tier 6 #22). We register on next idle so
// the initial bundle parse isn't delayed. Failures are swallowed: SW is a
// progressive enhancement; the game runs fine without it.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support is best-effort */
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DiscordProvider>
      <App />
    </DiscordProvider>
  </StrictMode>
);

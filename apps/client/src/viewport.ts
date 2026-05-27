/** Apply `touch-device` on <html> for larger tap targets and mobile menu layout. */
export function initViewportHints(): () => void {
  const coarse = window.matchMedia("(pointer: coarse)");
  const narrow = window.matchMedia("(max-width: 520px)");
  const short = window.matchMedia("(max-height: 720px)");

  const apply = () => {
    const touch = coarse.matches || narrow.matches;
    document.documentElement.classList.toggle("touch-device", touch);
    document.documentElement.classList.toggle("viewport-short", short.matches);
  };

  apply();
  coarse.addEventListener("change", apply);
  narrow.addEventListener("change", apply);
  short.addEventListener("change", apply);

  return () => {
    coarse.removeEventListener("change", apply);
    narrow.removeEventListener("change", apply);
    short.removeEventListener("change", apply);
  };
}

/** Debug-session viewport snapshot (Discord mobile iframe sizing). */
export function logViewportSnapshot(location: string, hypothesisId: string): void {
  // #region agent log
  fetch("http://127.0.0.1:7678/ingest/d20a9755-d2ba-419e-8176-8d0072361f65", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "680857" },
    body: JSON.stringify({
      sessionId: "680857",
      hypothesisId,
      location,
      message: "viewport snapshot",
      data: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        visualViewportH: window.visualViewport?.height ?? null,
        visualViewportW: window.visualViewport?.width ?? null,
        dpr: window.devicePixelRatio,
        touchDevice: document.documentElement.classList.contains("touch-device"),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

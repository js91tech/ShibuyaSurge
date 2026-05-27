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

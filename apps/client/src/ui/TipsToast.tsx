const TIPS = [
  "Cursed energy orbs magnetize when you get close.",
  "Domain Expansion freezes time — use it when surrounded.",
  "Level up slows time so you can pick a technique safely.",
  "Elites drop more XP — hunt the large purple spirits.",
  "Boss spawns at 3:00 or when the timer runs low.",
  "WASD or the left joystick to move.",
];

export function pickTip(elapsed: number): string {
  return TIPS[Math.floor(elapsed / 25) % TIPS.length];
}

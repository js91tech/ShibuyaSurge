import type { CharacterDef } from "./types.js";

export const CHARACTERS: Record<string, CharacterDef> = {
  yuji: {
    id: "yuji",
    name: "Yuji Itadori",
    role: "Bruiser",
    color: 0xff6b4a,
    maxHp: 130,
    speed: 195,
    starterTechnique: "divergent_fist",
  },
  megumi: {
    id: "megumi",
    name: "Megumi Fushiguro",
    role: "Summoner",
    color: 0x4a7cff,
    maxHp: 105,
    speed: 180,
    starterTechnique: "divine_dogs",
  },
  nobara: {
    id: "nobara",
    name: "Nobara Kugisaki",
    role: "Ranged DPS",
    color: 0xff4a8c,
    maxHp: 95,
    speed: 190,
    starterTechnique: "straw_doll",
  },
  gojo: {
    id: "gojo",
    name: "Satoru Gojo",
    role: "Mage",
    color: 0x9b7bff,
    maxHp: 85,
    speed: 185,
    starterTechnique: "blue_pull",
  },
  // Heavy-weapon brawler. Heavenly Restriction grants raw stats in lieu of
  // cursed energy, so her base HP/speed are the highest of the roster.
  maki: {
    id: "maki",
    name: "Maki Zenin",
    role: "Brawler",
    color: 0x166534,
    maxHp: 150,
    speed: 200,
    starterTechnique: "cursed_tools",
  },
  // Cursed-Speech AoE controller. Slightly squishier; payoff is wide
  // crowd damage from her starter shout.
  toge: {
    id: "toge",
    name: "Toge Inumaki",
    role: "Controller",
    color: 0xcbd5e1,
    maxHp: 100,
    speed: 185,
    starterTechnique: "cursed_speech",
  },
  // Hybrid swordsman with Rika's spirit. Balanced HP/speed; his draw is
  // the Copy passive that re-fires a random owned tech occasionally.
  yuta: {
    id: "yuta",
    name: "Yuta Okkotsu",
    role: "Hybrid",
    color: 0x7c3aed,
    maxHp: 115,
    speed: 190,
    starterTechnique: "rika_swing",
  },
};

export const CHARACTER_LIST = Object.values(CHARACTERS);

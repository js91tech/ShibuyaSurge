import { useEffect, useRef, useState } from "react";

interface DamageFlashProps {
  hp: number;
  maxHp: number;
}

/** Red border flash whenever HP drops noticeably */
export function DamageFlash({ hp, maxHp }: DamageFlashProps) {
  const lastHp = useRef(hp);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const drop = lastHp.current - hp;
    lastHp.current = hp;
    if (drop > Math.max(2, maxHp * 0.02)) {
      setFlash(true);
      const id = setTimeout(() => setFlash(false), 220);
      return () => clearTimeout(id);
    }
  }, [hp, maxHp]);

  if (!flash) return null;
  return <div className="damage-flash" aria-hidden />;
}

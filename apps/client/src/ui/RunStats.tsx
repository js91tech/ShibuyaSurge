import { useEffect, useRef, useState } from "react";

interface RunStatsProps {
  elapsed: number;
  exorcismCount: number;
  hp: number;
}

/** DPS-like rolling stats: kills/min over 10s window + recent damage taken */
export function RunStats({ elapsed, exorcismCount, hp }: RunStatsProps) {
  const samples = useRef<{ t: number; kills: number; hp: number }[]>([]);
  const [killsPerMin, setKpm] = useState(0);
  const [peak, setPeak] = useState(0);
  const [dmgTakenPerMin, setDmgPm] = useState(0);

  useEffect(() => {
    const arr = samples.current;
    arr.push({ t: elapsed, kills: exorcismCount, hp });
    while (arr.length > 1 && elapsed - arr[0].t > 10) arr.shift();

    if (arr.length > 1) {
      const span = Math.max(0.1, arr[arr.length - 1].t - arr[0].t);
      const dKills = arr[arr.length - 1].kills - arr[0].kills;
      const kpm = (dKills / span) * 60;
      setKpm(kpm);
      setPeak((p) => Math.max(p, kpm));
      const dHp = arr[0].hp - arr[arr.length - 1].hp;
      const dmg = Math.max(0, dHp);
      setDmgPm((dmg / span) * 60);
    }
  }, [elapsed, exorcismCount, hp]);

  return (
    <div className="run-stats panel">
      <div className="run-stats-row">
        <span>Kills/min</span>
        <strong>{killsPerMin.toFixed(0)}</strong>
      </div>
      <div className="run-stats-row">
        <span>Peak</span>
        <strong>{peak.toFixed(0)}</strong>
      </div>
      <div className="run-stats-row">
        <span>DPS taken/min</span>
        <strong>{dmgTakenPerMin.toFixed(0)}</strong>
      </div>
    </div>
  );
}

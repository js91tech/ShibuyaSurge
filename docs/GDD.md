# Game Design Document — Shibuya Surge

## Pitch

Vampire Survivors–style **bullet heaven** with **JJK sorcerers**, **co-op 2–4** in a Discord Activity, 12-minute exorcism runs.

## Core loop

1. Lobby: character + ready
2. Survive waves + elites
3. Level → draft technique (3 choices)
4. Boss at 3:00
5. Grade screen + talismans

## Characters (v1)

| ID | Name | Starter |
|----|------|---------|
| yuji | Yuji Itadori | Divergent Fist |
| megumi | Megumi Fushiguro | Divine Dogs |
| nobara | Nobara Kugisaki | Straw Doll |
| gojo | Satoru Gojo | Blue |

## Co-op

- Shared arena, shared camera centroid
- Individual XP/builds
- 5s revive channel, 2 downs → spectate
- One domain active at a time

## Enemies

Trash: flyer, charger, swarm, tank, ranged, exploder  
Elites: grade1–3  
Boss: Volcanic Special Grade (Jogo homage), 2 phases at 50% HP

## Meta

Cursed Talismans persist per Discord user via `/api/meta/:userId`.

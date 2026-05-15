# Watchalong Graphics (Local) — Start Here

Aplicație locală care generează overlay-uri web pentru OBS (Browser Source) + un Admin Panel pentru control live.

## Ce rezolvă
- Alegi **meciul principal** (HUD: scor, timp, evenimente, stats).
- Alegi **meciuri secundare** (Ticker: scoruri live).
- Alegi **tema grafică** (per competiție) și **format** (16:9 / 9:16).
- Totul se actualizează **live**, fără refresh (WebSocket).

## Stack
- Client: Vite + React + TypeScript + Tailwind + Framer Motion + Zustand
- Server: Node + Express + ws (WebSocket)
- Provider: SportMonks (cu layer de adaptare)

## Rute importante
- Admin: `/admin`
- Overlays:
  - `/overlay/master` (all widgets)
  - `/overlay/scoreboard`
  - `/overlay/lineups` (HOME)
  - `/overlay/lineups-away` (AWAY)
  - `/overlay/standings`
  - `/overlay/livestandings`
  - `/overlay/startingsoon`

## OBS Quick Setup
- Browser Source (16:9): 1920×1080 → URL: `http://localhost:5173/overlay/master`
- Browser Source (9:16): 1080×1920 → URL: `http://localhost:5173/overlay/master`

## 📚 Documentație

**Citește în ordinea asta:**

1. `DESIGN-DOC-2025.md` — **Design Document complet** (START HERE)
2. `01-PRODUCT-SPEC.md` — Product spec detaliat
3. `02-ARCHITECTURE.md` — Arhitectură tehnică
4. `03-DATA-MODEL.md` — Modele de date
5. `04-WS-EVENTS.md` — WebSocket events
6. `05-SPORTMONKS-ADAPTER.md` — SportMonks integration
7. `07-THEMING-DESIGN-SYSTEM.md` — Design system
